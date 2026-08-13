import { beforeEach, describe, expect, it } from '@jest/globals';
import { PublicationService } from '../PublicationService.js';

const contribution = (pubId, authorId, position) => {
  return {
    pubId: pubId,
    authorId: authorId,
    position: position,
  };
};

const publication = (pubId) => {
  return {
    pubId: pubId,
    title: pubId,
    normalisedTitle: pubId.toLowerCase(),
    externalId: null,
  };
};

const createConnector = ({
  paper = null, citations = [], authorsByPub = {},
}) => {
  return {
    id: 'openalex',
    getPublication: async () =>
      paper,
    getContributions: async (pubId) =>
      authorsByPub[pubId] ?? [],
    getCitations: async () =>
      citations,
  };
};

describe('PublicationService', () => {
  describe('getCitationTree', () => {
    describe('when the publication exists', () => {
      let tree;

      beforeEach(async () => {
        const connector = createConnector({
          paper: publication('W1'),
          citations: [publication('W2'), publication('W3')],
          authorsByPub: {
            W1: [contribution('W1', 'A1', 1)],
            W2: [contribution('W2', 'A1', 1)],
            W3: [contribution('W3', 'Z1', 1)],
          },
        });
        tree = await new PublicationService({
          connector: connector,
        }).getCitationTree('W1');
      });

      it('returns the publication', () => {
        expect(tree.publication.pubId).toBe('W1');
      });

      it('includes the cited contributions', () => {
        expect(tree.citedContributions).toEqual([contribution('W1', 'A1', 1)]);
      });

      it('includes each citing publication in order', () => {
        expect(tree.citing.map((entry) =>
          entry.publication.pubId)).toEqual(['W2', 'W3']);
      });

      it('includes the contributions of each citing publication', () => {
        expect(tree.citing[0].contributions).toEqual([contribution('W2', 'A1', 1)]);
      });

      it('includes the citations', () => {
        expect(tree.citations).toEqual([publication('W2'), publication('W3')]);
      });
    });

    describe('when the publication is not found', () => {
      let tree;

      beforeEach(async () => {
        const connector = createConnector({ paper: null });
        tree = await new PublicationService({
          connector: connector,
        }).getCitationTree('missing');
      });

      it('returns null', () => {
        expect(tree).toBeNull();
      });
    });
  });
});
