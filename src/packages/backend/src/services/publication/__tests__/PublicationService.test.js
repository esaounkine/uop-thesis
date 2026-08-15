import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { PublicationService } from '../PublicationService.js';

const createContribution = (pubId, authorId, position) => {
  return {
    pubId: pubId,
    authorId: authorId,
    position: position,
  };
};

const createPublication = (pubId, contributions = []) => {
  return {
    pubId: pubId,
    title: pubId,
    normalisedTitle: pubId.toLowerCase(),
    externalId: null,
    year: null,
    contributions: contributions,
  };
};

const createConnector = ({
  paper = null, citations = [], searchResults = [],
}) => {
  return {
    id: 'openalex',
    getPublication: jest.fn().mockResolvedValue(paper),
    getCitations: jest.fn().mockResolvedValue(citations),
    searchPublications: jest.fn().mockResolvedValue(searchResults),
  };
};

describe('PublicationService', () => {
  describe('getCitationTree', () => {
    describe('when the publication exists', () => {
      let tree;

      beforeEach(async () => {
        const connectorMock = createConnector({
          paper: createPublication('W1', [createContribution('W1', 'A1', 1)]),
          citations: [createPublication('W2', [createContribution('W2', 'A1', 1)]), createPublication('W3', [createContribution('W3', 'Z1', 1)])],
        });
        tree = await new PublicationService({
          connector: connectorMock,
        }).getCitationTree('W1');
      });

      it('returns the publication', () => {
        expect(tree.publication.pubId).toBe('W1');
      });

      it('takes the cited contributions from the publication', () => {
        expect(tree.citedContributions).toEqual([createContribution('W1', 'A1', 1)]);
      });

      it('includes each citing publication in order', () => {
        expect(tree.citing.map((entry) =>
          entry.publication.pubId)).toEqual(['W2', 'W3']);
      });

      it('takes the contributions from each citing publication', () => {
        expect(tree.citing[0].contributions).toEqual([createContribution('W2', 'A1', 1)]);
      });

      it('includes the citations', () => {
        expect(tree.citations).toEqual([createPublication('W2', [createContribution('W2', 'A1', 1)]), createPublication('W3', [createContribution('W3', 'Z1', 1)])]);
      });
    });

    describe('when the publication is not found', () => {
      let tree;

      beforeEach(async () => {
        const connectorMock = createConnector({ paper: null });
        tree = await new PublicationService({
          connector: connectorMock,
        }).getCitationTree('missing');
      });

      it('returns null', () => {
        expect(tree).toBeNull();
      });
    });
  });

  describe('searchByName', () => {
    describe('when papers match', () => {
      let candidates;

      beforeEach(async () => {
        const connectorMock = createConnector({
          searchResults: [createPublication('W1'), createPublication('W2')],
        });
        candidates = await new PublicationService({
          connector: connectorMock,
        }).searchByName('a title');
      });

      it('returns the candidate papers', () => {
        expect(candidates).toEqual([createPublication('W1'), createPublication('W2')]);
      });
    });
  });
});
