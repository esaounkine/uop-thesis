import {
  beforeEach, describe, expect, it,
} from '@jest/globals';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsDir } from '../../../config/env.js';
import { DbClient } from '../../../db/client.js';
import * as schema from '../../../db/schema.js';
import { AuthorRepository } from '../../../repositories/AuthorRepository.js';
import { CitationRepository } from '../../../repositories/CitationRepository.js';
import { ContributionRepository } from '../../../repositories/ContributionRepository.js';
import { PublicationRepository } from '../../../repositories/PublicationRepository.js';
import { TreeService } from '../TreeService.js';

const createPublication = (pubId) => {
  return {
    pubId: pubId,
    title: pubId,
    normalisedTitle: pubId.toLowerCase(),
    externalId: null,
    year: null,
  };
};

const createContribution = (pubId, authorId) => {
  return {
    pubId: pubId,
    authorId: authorId,
    position: 1,
  };
};

const createTree = () => {
  return {
    publication: createPublication('W1'),
    citedContributions: [createContribution('W1', 'A1')],
    citing: [
      {
        publication: createPublication('W2'),
        contributions: [createContribution('W2', 'A1')],
        classification: 'self-direct',
      },
      {
        publication: createPublication('W3'),
        contributions: [createContribution('W3', 'Z1')],
        classification: 'external',
      },
    ],
  };
};

const createTreeService = (db) =>
  new TreeService({
    publicationRepository: new PublicationRepository(db),
    authorRepository: new AuthorRepository(db),
    contributionRepository: new ContributionRepository(db),
    citationRepository: new CitationRepository(db),
  });

describe('TreeService', () => {
  let db;
  let treeService;

  beforeEach(() => {
    ({ db } = new DbClient());
    migrate(db, { migrationsFolder: migrationsDir });
    treeService = createTreeService(db);
  });

  describe('save', () => {
    describe('a classified tree', () => {
      beforeEach(() => {
        treeService.save(createTree());
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
            sourcePubId: 'W2',
            targetPubId: 'W1',
            classification: 'self-direct',
          },
          {
            sourcePubId: 'W3',
            targetPubId: 'W1',
            classification: 'external',
          },
        ]);
      });
    });

    describe('when the contributions carry author names and affiliations', () => {
      beforeEach(() => {
        treeService.save({
          publication: createPublication('W1'),
          citedContributions: [
            {
              pubId: 'W1',
              authorId: 'A1',
              authorName: 'Jane Roe',
              organisation: 'University 1',
              position: 1,
            },
          ],
          citing: [],
        });
      });

      it('stores the author with a normalised name and organisation', () => {
        expect(db.select().from(schema.authors)
          .all()).toEqual([
          {
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
        treeService.save(createTree());
        restored = treeService.restore('W1');
      });

      it('rebuilds the same classified tree', () => {
        expect(restored).toEqual(createTree());
      });
    });

    describe('when the publication is not in the db', () => {
      it('returns null', () => {
        expect(treeService.restore('missing')).toBeNull();
      });
    });
  });
});
