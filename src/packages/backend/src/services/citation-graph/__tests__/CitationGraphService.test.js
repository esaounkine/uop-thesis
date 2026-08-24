import {
  beforeEach, describe, expect, it,
} from '@jest/globals';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsDir } from '../../../config/env.js';
import { DbClient } from '../../../db/DbClient.js';
import * as schema from '../../../db/schema.js';
import { AuthorRepository } from '../../../repositories/AuthorRepository.js';
import { CitationRepository } from '../../../repositories/CitationRepository.js';
import { ContributionRepository } from '../../../repositories/ContributionRepository.js';
import { PublicationRepository } from '../../../repositories/PublicationRepository.js';
import { CitationGraphService } from '../CitationGraphService.js';

const PROVIDER = 'openalex';

const createContribution = (pubId, authorId) => {
  return {
    provider: PROVIDER,
    pubId: pubId,
    authorId: authorId,
    position: 1,
  };
};

const createPublication = (pubId, authorId) => {
  return {
    provider: PROVIDER,
    pubId: pubId,
    title: pubId,
    normalisedTitle: pubId.toLowerCase(),
    externalId: null,
    year: null,
    citationCount: null,
    contributions: [createContribution(pubId, authorId)],
  };
};

const createTree = () => {
  return {
    publication: createPublication('W1', 'A1'),
    citations: [
      {
        publication: createPublication('W2', 'A1'),
        classification: 'self-direct',
      },
      {
        publication: createPublication('W3', 'Z1'),
        classification: 'external',
      },
    ],
  };
};

const createCitationGraphService = (db) =>
  new CitationGraphService({
    provider: PROVIDER,
    publicationRepository: new PublicationRepository(db),
    authorRepository: new AuthorRepository(db),
    contributionRepository: new ContributionRepository(db),
    citationRepository: new CitationRepository(db),
  });

describe('CitationGraphService', () => {
  let db;
  let citationGraph;

  beforeEach(() => {
    ({ db } = new DbClient());
    migrate(db, { migrationsFolder: migrationsDir });
    citationGraph = createCitationGraphService(db);
  });

  describe('save', () => {
    describe('a classified tree', () => {
      beforeEach(() => {
        citationGraph.save(createTree());
      });

      it('stores every publication', () => {
        const ids = db.select().from(schema.publications)
          .all()
          .map((row) =>
            row.pubId)
          .sort();
        expect(ids).toEqual([
          'W1',
          'W2',
          'W3',
        ]);
      });

      it('stores the citation edges with their classification', () => {
        expect(db.select().from(schema.citations)
          .all()).toEqual([
          {
            provider: PROVIDER,
            sourcePubId: 'W2',
            targetPubId: 'W1',
            classification: 'self-direct',
          },
          {
            provider: PROVIDER,
            sourcePubId: 'W3',
            targetPubId: 'W1',
            classification: 'external',
          },
        ]);
      });
    });

    describe('when the contributions carry author names and affiliations', () => {
      beforeEach(() => {
        citationGraph.save({
          publication: {
            ...createPublication('W1', 'A1'),
            contributions: [
              {
                pubId: 'W1',
                authorId: 'A1',
                authorName: 'Jane Roe',
                organisation: 'University 1',
                position: 1,
              },
            ],
          },
          citations: [],
        });
      });

      it('stores the author with a normalised name and organisation', () => {
        expect(db.select().from(schema.authors)
          .all()).toEqual([
          {
            provider: PROVIDER,
            authorId: 'A1',
            originalName: 'Jane Roe',
            normalisedName: 'jane roe',
            organisation: 'University 1',
          },
        ]);
      });
    });
  });

  describe('restore', () => {
    describe('when the tree was saved', () => {
      let restored;

      beforeEach(() => {
        citationGraph.save(createTree());
        restored = citationGraph.restore('W1');
      });

      it('rebuilds the same classified tree', () => {
        expect(restored).toEqual(createTree());
      });
    });

    describe('when the publication is not in the db', () => {
      it('returns null', () => {
        expect(citationGraph.restore('missing')).toBeNull();
      });
    });
  });
});
