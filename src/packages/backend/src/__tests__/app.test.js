import { beforeEach, describe, expect, it } from '@jest/globals';
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
      const connector = {
        id: 'stub',
        getPublication: async () =>
          publication('W1'),
        getContributions: async (pubId) =>
          [contribution(pubId, 'A1')],
        getCitations: async () =>
          [publication('W2')],
      };
      const { classificationService } = createApp({
        dbPath: ':memory:',
        connector: connector,
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
