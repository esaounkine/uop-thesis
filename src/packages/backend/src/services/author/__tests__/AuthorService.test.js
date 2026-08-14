import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { AuthorService } from '../AuthorService.js';

const createAuthor = (authorId) => {
  return {
    authorId: authorId,
    originalName: authorId,
    normalisedName: authorId.toLowerCase(),
  };
};

const createPublication = (pubId) => {
  return {
    pubId: pubId,
    title: pubId,
    normalisedTitle: pubId.toLowerCase(),
    externalId: null,
  };
};

const createConnector = ({
  author = null, publications = [],
}) => {
  return {
    id: 'openalex',
    getAuthorById: jest.fn().mockResolvedValue(author),
    getAuthorPublications: jest.fn().mockResolvedValue(publications),
  };
};

describe('AuthorService', () => {
  describe('getPublications', () => {
    describe('when the author exists', () => {
      let result;

      beforeEach(async () => {
        const connectorMock = createConnector({
          author: createAuthor('A1'),
          publications: [createPublication('W1'), createPublication('W2')],
        });
        result = await new AuthorService({
          connector: connectorMock,
        }).getPublications('A1');
      });

      it('returns the author', () => {
        expect(result.author).toEqual(createAuthor('A1'));
      });

      it('returns their publications', () => {
        expect(result.publications).toEqual([createPublication('W1'), createPublication('W2')]);
      });
    });

    describe('when the author is not found', () => {
      let result;

      beforeEach(async () => {
        const connectorMock = createConnector({ author: null });
        result = await new AuthorService({
          connector: connectorMock,
        }).getPublications('missing');
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });
});
