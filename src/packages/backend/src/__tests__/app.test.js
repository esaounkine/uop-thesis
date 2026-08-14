import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { createApp } from '../app.js';

const publication = (pubId) => {
  return {
    pubId: pubId,
    title: pubId,
    normalisedTitle: pubId.toLowerCase(),
    externalId: null,
  };
};

const contribution = (pubId, authorId) => {
  return {
    pubId: pubId,
    authorId: authorId,
    position: 1,
  };
};

describe('createApp', () => {
  describe('when wired with a stub connector', () => {
    let result;

    beforeEach(async () => {
      const connectorMock = {
        id: 'stub',
        getPublication: jest.fn().mockResolvedValue(publication('W1')),
        getContributions: jest.fn(async (pubId) =>
          [contribution(pubId, 'A1')]),
        getCitations: jest.fn().mockResolvedValue([publication('W2')]),
      };
      const { classificationService } = createApp({
        dbPath: ':memory:',
        connector: connectorMock,
      });
      result = await classificationService.getPaperMetrics('W1');
    });

    it('computes metrics through the wired services', () => {
      expect(result.metrics.total).toBe(1);
    });

    it('classifies the shared-lead citation as a direct self citation', () => {
      expect(result.metrics.self.direct).toBe(1);
    });
  });
});
