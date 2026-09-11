import {
  beforeEach, describe, expect, it,
} from '@jest/globals';
import { ClassificationService } from '../ClassificationService.js';

const contribution = (authorId, position) => {
  return {
    authorId: authorId,
    position: position,
  };
};

describe('ClassificationService', () => {
  let service;

  beforeEach(() => {
    service = new ClassificationService();
  });

  describe('getCitationType', () => {
    describe('when the selected author appears in both publications', () => {
      it('is direct regardless of author position', () => {
        expect(service.getCitationType(
          [contribution('A1', 1), contribution('A2', 2)],
          [contribution('C1', 1), contribution('A2', 2)],
          'A2',
        )).toBe('self-direct');
      });

      it('is direct when author positions differ', () => {
        expect(service.getCitationType(
          [contribution('A1', 1), contribution('A2', 2)],
          [contribution('A2', 1), contribution('C1', 2)],
          'A2',
        )).toBe('self-direct');
      });
    });

    describe('when only another author is shared', () => {
      it('is co-author even when first authors match', () => {
        expect(service.getCitationType(
          [contribution('A1', 1), contribution('A2', 2)],
          [contribution('A1', 1), contribution('C1', 2)],
          'A2',
        )).toBe('self-coauthor');
      });

      it('is co-author when the shared author is not first', () => {
        expect(service.getCitationType(
          [contribution('A1', 1), contribution('A2', 2)],
          [contribution('C1', 1), contribution('A2', 2)],
          'A1',
        )).toBe('self-coauthor');
      });
    });

    describe('when no author is shared', () => {
      it('is external', () => {
        expect(service.getCitationType(
          [contribution('A1', 1)],
          [contribution('B1', 1)],
          'A1',
        )).toBe('external');
      });

      describe('and both lists contain unknown authors', () => {
        it('does not match missing identifiers', () => {
          expect(service.getCitationType(
            [contribution('A1', 1), contribution(null, 2)],
            [contribution('B1', 1), contribution(null, 2)],
            'A1',
          )).toBe('external');
        });
      });
    });

    describe('when no researcher is selected', () => {
      it('rejects the missing context', () => {
        expect(() =>
          service.getCitationType([], []))
          .toThrow('authorId is required');
      });

      describe('and the identifier is blank', () => {
        it('rejects the blank identifier', () => {
          expect(() =>
            service.getCitationType([], [], ' '))
            .toThrow('authorId is required');
        });
      });
    });
  });

  describe('getMetrics', () => {
    describe('when there are no citations', () => {
      it('is all zeros', () => {
        expect(service.getMetrics([])).toEqual({
          total: 0,
          external: 0,
          self: {
            total: 0,
            direct: 0,
            coauthor: 0,
          },
        });
      });
    });

    describe('when the citations are mixed', () => {
      it('counts each category', () => {
        expect(service.getMetrics([
          'self-direct',
          'self-coauthor',
          'self-coauthor',
          'external',
        ])).toEqual({
          total: 4,
          external: 1,
          self: {
            total: 3,
            direct: 1,
            coauthor: 2,
          },
        });
      });
    });
  });
});
