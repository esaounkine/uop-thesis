import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';

const normaliseMock = jest.fn();

jest.unstable_mockModule('../../../lib/normalise.js', () => {
  return { normalise: normaliseMock };
});

const {
  convertCitationTreeToDbRows,
  convertDbRowsToCitationTree,
} = await import('../converters.js');

const contribution1 = Object.freeze({
  pubId: 'W1',
  authorId: 'A1',
  authorName: 'Jane Roe',
  position: 1,
});
const contribution2 = Object.freeze({
  pubId: 'W2',
  authorId: 'A2',
  authorName: 'John Doe',
  position: 2,
});
const publication1 = Object.freeze({
  pubId: 'W1',
  title: 'Paper 1',
  contributions: Object.freeze([contribution1]),
});
const publication2 = Object.freeze({
  pubId: 'W2',
  title: 'Paper 2',
  contributions: Object.freeze([contribution2]),
});
const tree = Object.freeze({
  publication: publication1,
  citations: Object.freeze([
    Object.freeze({
      publication: publication2,
      classification: 'external',
    }),
  ]),
});

beforeEach(() => {
  normaliseMock.mockReset();
});

describe('convertCitationTreeToDbRows', () => {
  describe('when authors have names', () => {
    describe('and normalise returns names', () => {
      beforeEach(() => {
        normaliseMock.mockReturnValueOnce('jane roe')
          .mockReturnValueOnce('john doe');
      });

      it('converts frozen input into rows', () => {
        expect(convertCitationTreeToDbRows('openalex', tree)).toEqual({
          publications: [
            {
              provider: 'openalex',
              pubId: 'W1',
              title: 'Paper 1',
              normalisedTitle: undefined,
              externalId: undefined,
              year: null,
            },
            {
              provider: 'openalex',
              pubId: 'W2',
              title: 'Paper 2',
              normalisedTitle: undefined,
              externalId: undefined,
              year: null,
            },
          ],
          authors: [
            {
              provider: 'openalex',
              authorId: 'A1',
              originalName: 'Jane Roe',
              normalisedName: 'jane roe',
              organisation: null,
            },
            {
              provider: 'openalex',
              authorId: 'A2',
              originalName: 'John Doe',
              normalisedName: 'john doe',
              organisation: null,
            },
          ],
          contributions: [
            {
              provider: 'openalex',
              pubId: 'W1',
              authorId: 'A1',
              position: 1,
            },
            {
              provider: 'openalex',
              pubId: 'W2',
              authorId: 'A2',
              position: 2,
            },
          ],
          citations: [
            {
              provider: 'openalex',
              sourcePubId: 'W2',
              targetPubId: 'W1',
              classification: 'external',
            },
          ],
        });
      });
    });

    describe('and normalise returns empty strings', () => {
      beforeEach(() => {
        normaliseMock.mockReturnValue('');
      });

      it('keeps the empty names', () => {
        expect(convertCitationTreeToDbRows('openalex', tree)
          .authors.map((author) =>
            author.normalisedName)).toEqual(['', '']);
      });
    });

    describe('but normalise throws on the second author', () => {
      beforeEach(() => {
        normaliseMock.mockReturnValueOnce('jane roe')
          .mockImplementationOnce(() => {
            throw new Error('error-1');
          });
      });

      it('propagates the error', () => {
        expect(() =>
          convertCitationTreeToDbRows('openalex', tree)).toThrow('error-1');
      });
    });
  });

  describe('when author names are missing', () => {
    it('stores null names', () => {
      expect(convertCitationTreeToDbRows('openalex', {
        publication: {
          pubId: 'W1',
          contributions: [
            {
              pubId: 'W1',
              authorId: 'A1',
              position: 1,
            },
          ],
        },
        citations: [],
      }).authors).toEqual([
        {
          provider: 'openalex',
          authorId: 'A1',
          originalName: null,
          normalisedName: null,
          organisation: null,
        },
      ]);
    });
  });

  describe('when contributions are missing', () => {
    it('returns no authors', () => {
      expect(convertCitationTreeToDbRows('openalex', {
        publication: { pubId: 'W1' },
        citations: [],
      }).authors).toEqual([]);
    });
  });
});

describe('convertDbRowsToCitationTree', () => {
  const publication = Object.freeze({ pubId: 'W1' });
  const citingPublication = Object.freeze({ pubId: 'W2' });

  describe('when rows include citations and contributions', () => {
    it('builds a tree from frozen rows', () => {
      expect(convertDbRowsToCitationTree(Object.freeze({
        publication: publication,
        citingPublications: Object.freeze([citingPublication]),
        contributions: Object.freeze([contribution2, contribution1]),
        citations: Object.freeze([
          Object.freeze({
            sourcePubId: 'W2',
            classification: 'external',
          }),
        ]),
      }))).toEqual({
        publication: {
          pubId: 'W1',
          contributions: [contribution1],
        },
        citations: [
          {
            publication: {
              pubId: 'W2',
              contributions: [contribution2],
            },
            classification: 'external',
          },
        ],
      });
    });
  });

  describe('when rows contain only the cited publication', () => {
    it('returns empty citations and contributions', () => {
      expect(convertDbRowsToCitationTree({
        publication: publication,
        citingPublications: [],
        contributions: [],
        citations: [],
      })).toEqual({
        publication: {
          pubId: 'W1',
          contributions: [],
        },
        citations: [],
      });
    });
  });
});
