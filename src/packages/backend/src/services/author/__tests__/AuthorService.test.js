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
  author = null, publications = [], searchResults = [],
}) => {
  return {
    id: 'openalex',
    getAuthorById: jest.fn().mockResolvedValue(author),
    getAuthorPublications: jest.fn().mockResolvedValue(publications),
    searchAuthors: jest.fn().mockResolvedValue(searchResults),
  };
};

describe('AuthorService', () => {
  describe('searchByName', () => {
    describe('when authors match', () => {
      let candidates;

      beforeEach(async () => {
        const connectorMock = createConnector({
          searchResults: [createAuthor('A1'), createAuthor('A2')],
        });
        candidates = await new AuthorService({
          connector: connectorMock,
        }).searchByName('jane');
      });

      it('returns the candidate authors', () => {
        expect(candidates).toEqual([createAuthor('A1'), createAuthor('A2')]);
      });
    });
  });

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

    describe('when cache is disabled', () => {
      let connectorMock;

      beforeEach(async () => {
        connectorMock = createConnector({
          author: createAuthor('A1'),
        });
        await new AuthorService({
          connector: connectorMock,
        }).getPublications('A1', { cache: false });
      });

      it('forwards the flag to the author fetch', () => {
        expect(connectorMock.getAuthorById).toHaveBeenCalledWith('A1', { cache: false });
      });

      it('forwards the flag to the publications fetch', () => {
        expect(connectorMock.getAuthorPublications).toHaveBeenCalledWith('A1', { cache: false });
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
