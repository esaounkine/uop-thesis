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
    describe('when the papers share no author', () => {
      it('is external', () => {
        expect(service.getCitationType(
          [contribution('A1', 1)],
          [contribution('B1', 1)],
        )).toBe('external');
      });
    });

    describe('when both lead authors are the same', () => {
      it('is a direct self citation', () => {
        expect(service.getCitationType(
          [contribution('A1', 1), contribution('A2', 2)],
          [contribution('A1', 1), contribution('C1', 2)],
        )).toBe('self-direct');
      });
    });

    describe('when the cited lead is a co-author of the citing paper', () => {
      it('is a co-author self citation', () => {
        expect(service.getCitationType(
          [contribution('A1', 1)],
          [contribution('C1', 1), contribution('A1', 2)],
        )).toBe('self-coauthor');
      });
    });

    describe('when only a non-lead author is shared', () => {
      it('is a co-author self citation', () => {
        expect(service.getCitationType(
          [contribution('A1', 1), contribution('B1', 2)],
          [contribution('C1', 1), contribution('B1', 2)],
        )).toBe('self-coauthor');
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
