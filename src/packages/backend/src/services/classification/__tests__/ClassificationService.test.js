import { beforeEach, describe, expect, it } from '@jest/globals';
import { ClassificationService } from '../ClassificationService.js';

const contribution = (authorId, position) => ({
  pubId: 'X',
  authorId,
  position,
});

describe('ClassificationService', () => {
  let service;

  beforeEach(() => {
    service = new ClassificationService();
  });

  describe('classifyCitation', () => {
    describe('when the papers share no author', () => {
      let label;

      beforeEach(() => {
        label = service.classifyCitation(
          [contribution('A1', 1)],
          [contribution('B1', 1)],
        );
      });

      it('is external', () => {
        expect(label)
          .toBe('external');
      });
    });

    describe('when both lead authors are the same', () => {
      let label;

      beforeEach(() => {
        label = service.classifyCitation(
          [contribution('A1', 1), contribution('A2', 2)],
          [contribution('A1', 1), contribution('C1', 2)],
        );
      });

      it('is a direct self citation', () => {
        expect(label)
          .toBe('self-direct');
      });
    });

    describe('when the cited lead is a co-author of the citing paper', () => {
      let label;

      beforeEach(() => {
        label = service.classifyCitation(
          [contribution('A1', 1)],
          [contribution('C1', 1), contribution('A1', 2)],
        );
      });

      it('is a co-author self citation', () => {
        expect(label)
          .toBe('self-coauthor');
      });
    });

    describe('when only a non-lead author is shared', () => {
      let label;

      beforeEach(() => {
        label = service.classifyCitation(
          [contribution('A1', 1), contribution('B1', 2)],
          [contribution('C1', 1), contribution('B1', 2)],
        );
      });

      it('is a co-author self citation', () => {
        expect(label)
          .toBe('self-coauthor');
      });
    });
  });

  describe('classify', () => {
    describe('when the citing papers are mixed', () => {
      let metrics;

      beforeEach(() => {
        const cited = [contribution('A1', 1), contribution('A2', 2)];

        metrics = service.classify(cited, [
          [contribution('A1', 1)], // direct
          [contribution('C1', 1), contribution('A1', 2)], // coauthor
          [contribution('Z1', 1)], // external
        ]);
      });

      it('counts the total', () => {
        expect(metrics.total)
          .toBe(3);
      });

      it('counts the external citations', () => {
        expect(metrics.external)
          .toBe(1);
      });

      it('counts the self citations', () => {
        expect(metrics.self.total)
          .toBe(2);
      });

      it('counts the direct self citations', () => {
        expect(metrics.self.direct)
          .toBe(1);
      });

      it('counts the co-author self citations', () => {
        expect(metrics.self.coauthor)
          .toBe(1);
      });
    });
  });

  describe('getPaperMetrics', () => {
    const citing = (pubId, contributions) => ({
      publication: { pubId },
      contributions,
    });

    describe('when the paper exists', () => {
      let result;

      beforeEach(async () => {
        const tree = {
          publication: { pubId: 'W1' },
          citedContributions: [contribution('A1', 1), contribution('A2', 2)],
          citing: [
            citing('W2', [contribution('A1', 1)]), // direct
            citing('W3', [contribution('C1', 1), contribution('A1', 2)]), // co-author
            citing('W4', [contribution('Z1', 1)]), // external
          ],
        };
        const publicationService = {
          getCitationTree: async () => tree,
        };
        result = await new ClassificationService({
          publicationService,
        }).getPaperMetrics('W1');
      });

      it('returns the paper', () => {
        expect(result.publication.pubId)
          .toBe('W1');
      });

      it('aggregates the metrics', () => {
        expect(result.metrics)
          .toEqual({
            total: 3,
            external: 1,
            self: {
              total: 2,
              direct: 1,
              coauthor: 1,
            },
          });
      });

      it('labels each citation for the debug details', () => {
        expect(result.citations)
          .toEqual([
            { publication: { pubId: 'W2' }, classification: 'self-direct' },
            { publication: { pubId: 'W3' }, classification: 'self-coauthor' },
            { publication: { pubId: 'W4' }, classification: 'external' },
          ]);
      });
    });

    describe('when the paper is not found', () => {
      let result;

      beforeEach(async () => {
        const publicationService = { getCitationTree: async () => null };
        result = await new ClassificationService({
          publicationService,
        }).getPaperMetrics('missing');
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });
});
