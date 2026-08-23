import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { PublicationService } from '../PublicationService.js';

const createPublication = (pubId) => {
  return {
    pubId: pubId,
    title: pubId,
    normalisedTitle: pubId.toLowerCase(),
    externalId: null,
    year: null,
    contributions: [],
  };
};

describe('PublicationService', () => {
  describe('getCitations', () => {
    let citations;

    beforeEach(async () => {
      const connectorMock = {
        getCitations: jest.fn().mockResolvedValue([createPublication('W2'), createPublication('W3')]),
      };
      citations = await new PublicationService({
        connector: connectorMock,
      }).getCitations('W1');
    });

    it('returns the citing publications', () => {
      expect(citations.map((publication) =>
        publication.pubId)).toEqual(['W2', 'W3']);
    });
  });
});
