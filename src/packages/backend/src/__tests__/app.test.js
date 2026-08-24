import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { wire } from '../app.js';

const createContribution = (pubId, authorId) => {
  return {
    pubId: pubId,
    authorId: authorId,
    position: 1,
  };
};

const createPublication = (pubId) => {
  return {
    pubId: pubId,
    title: pubId,
    normalisedTitle: pubId.toLowerCase(),
    externalId: null,
    year: null,
    contributions: [createContribution(pubId, 'A1')],
  };
};

describe('wire', () => {
  describe('with a stub connector', () => {
    let result;

    beforeEach(async () => {
      const connectorMock = {
        id: 'stub',
        getAuthorById: jest.fn().mockResolvedValue({
          authorId: 'A1',
          originalName: 'Jane Roe',
          normalisedName: 'jane roe',
          organisation: null,
        }),
        getAuthorPublications: jest.fn().mockResolvedValue([createPublication('W1')]),
        getCitations: jest.fn().mockResolvedValue([createPublication('W2')]),
      };
      const [provider] = wire({
        dbPath: ':memory:',
        connector: connectorMock,
      });
      result = await provider.metrics.getAuthorMetrics('A1');
    });

    it('builds a working provider for the injected connector', () => {
      expect(result.metrics.total).toBe(1);
    });

    it('classifies the shared-lead citation as a direct self citation', () => {
      expect(result.metrics.self.direct).toBe(1);
    });
  });
});
