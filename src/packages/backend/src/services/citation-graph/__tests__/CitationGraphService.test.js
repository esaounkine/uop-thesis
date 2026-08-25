import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { CitationGraphService } from '../CitationGraphService.js';

const PROVIDER = 'openalex';

describe('CitationGraphService', () => {
  let publicationRepositoryMock;
  let authorRepositoryMock;
  let contributionRepositoryMock;
  let citationRepositoryMock;
  let citationGraphService;

  beforeEach(() => {
    publicationRepositoryMock = {
      saveAll: jest.fn(),
      findPublication: jest.fn(),
      findPublications: jest.fn().mockReturnValue([]),
    };
    authorRepositoryMock = {
      saveAll: jest.fn(),
      findAuthor: jest.fn(),
    };
    contributionRepositoryMock = {
      saveAll: jest.fn(),
      findContributions: jest.fn().mockReturnValue([]),
    };
    citationRepositoryMock = {
      saveAll: jest.fn(),
      findCitations: jest.fn().mockReturnValue([]),
    };
    citationGraphService = new CitationGraphService({
      publicationRepository: publicationRepositoryMock,
      authorRepository: authorRepositoryMock,
      contributionRepository: contributionRepositoryMock,
      citationRepository: citationRepositoryMock,
    });
  });

  describe('storePubTree', () => {
    beforeEach(() => {
      citationGraphService.storePubTree(PROVIDER, {
        publication: {
          pubId: 'W1',
          title: 'W1',
          normalisedTitle: 'w1',
          externalId: null,
          year: 2020,
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
        citations: [
          {
            publication: {
              pubId: 'W2',
              title: 'W2',
              normalisedTitle: 'w2',
              externalId: null,
              year: 2019,
              contributions: [],
            },
            classification: 'self-direct',
          },
        ],
      });
    });

    it('stores the cited and citing publications', () => {
      expect(publicationRepositoryMock.saveAll).toHaveBeenCalledWith([
        {
          provider: PROVIDER,
          pubId: 'W1',
          title: 'W1',
          normalisedTitle: 'w1',
          externalId: null,
          year: 2020,
        },
        {
          provider: PROVIDER,
          pubId: 'W2',
          title: 'W2',
          normalisedTitle: 'w2',
          externalId: null,
          year: 2019,
        },
      ]);
    });

    it('stores the contributors with a normalised name', () => {
      expect(authorRepositoryMock.saveAll).toHaveBeenCalledWith([
        {
          provider: PROVIDER,
          authorId: 'A1',
          originalName: 'Jane Roe',
          normalisedName: 'jane roe',
          organisation: 'University 1',
        },
      ]);
    });

    it('stores the contributions', () => {
      expect(contributionRepositoryMock.saveAll).toHaveBeenCalledWith([
        {
          provider: PROVIDER,
          pubId: 'W1',
          authorId: 'A1',
          position: 1,
        },
      ]);
    });

    it('stores the citation edges with their classification', () => {
      expect(citationRepositoryMock.saveAll).toHaveBeenCalledWith([
        {
          provider: PROVIDER,
          sourcePubId: 'W2',
          targetPubId: 'W1',
          classification: 'self-direct',
        },
      ]);
    });
  });

  describe('getPubTree', () => {
    describe('when the repo returns the publication', () => {
      let restored;

      beforeEach(() => {
        publicationRepositoryMock.findPublication.mockReturnValue({
          provider: PROVIDER,
          pubId: 'W1',
          title: 'W1',
        });
        citationRepositoryMock.findCitations.mockReturnValue([
          {
            provider: PROVIDER,
            sourcePubId: 'W2',
            targetPubId: 'W1',
            classification: 'self-direct',
          },
        ]);
        publicationRepositoryMock.findPublications.mockReturnValue([
          {
            provider: PROVIDER,
            pubId: 'W2',
            title: 'W2',
          },
        ]);
        contributionRepositoryMock.findContributions.mockReturnValue([
          {
            provider: PROVIDER,
            pubId: 'W1',
            authorId: 'A1',
            position: 1,
          },
        ]);
        restored = citationGraphService.getPubTree(PROVIDER, 'W1');
      });

      it('rebuilds the cited publication with its contributions', () => {
        expect(restored.publication).toEqual({
          provider: PROVIDER,
          pubId: 'W1',
          title: 'W1',
          contributions: [
            {
              provider: PROVIDER,
              pubId: 'W1',
              authorId: 'A1',
              position: 1,
            },
          ],
        });
      });

      it('rebuilds each citation with its classification', () => {
        expect(restored.citations).toEqual([
          {
            publication: {
              provider: PROVIDER,
              pubId: 'W2',
              title: 'W2',
              contributions: [],
            },
            classification: 'self-direct',
          },
        ]);
      });
    });

    describe('when the repo returns no publication', () => {
      it('returns null', () => {
        publicationRepositoryMock.findPublication.mockReturnValue(undefined);
        expect(citationGraphService.getPubTree(PROVIDER, 'missing')).toBeNull();
      });
    });
  });

  describe('getAuthorTree', () => {
    describe('when the repo returns the author', () => {
      let restored;

      beforeEach(() => {
        authorRepositoryMock.findAuthor.mockReturnValue({
          provider: PROVIDER,
          authorId: 'A1',
        });
        contributionRepositoryMock.findContributions
          .mockImplementation((filters) =>
            (filters.authorId
              ? [{ pubId: 'W1' }, { pubId: 'W2' }]
              : []));
        publicationRepositoryMock.findPublication
          .mockImplementation((filters) => {
            return {
              provider: PROVIDER,
              pubId: filters.pubId,
            };
          });
        restored = citationGraphService.getAuthorTree(PROVIDER, 'A1');
      });

      it('returns the author', () => {
        expect(restored.author).toEqual({
          provider: PROVIDER,
          authorId: 'A1',
        });
      });

      it('rebuilds a tree per authored publication', () => {
        expect(restored.publications.map((entry) =>
          entry.publication.pubId)).toEqual(['W1', 'W2']);
      });
    });

    describe('when the repo returns no author', () => {
      it('returns null', () => {
        authorRepositoryMock.findAuthor.mockReturnValue(undefined);
        expect(citationGraphService.getAuthorTree(PROVIDER, 'missing')).toBeNull();
      });
    });
  });
});
