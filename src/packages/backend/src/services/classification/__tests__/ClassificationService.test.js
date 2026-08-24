import {
  beforeEach, describe, expect, it,
} from '@jest/globals';
import { ClassificationService } from '../ClassificationService.js';

const contribution = (authorId, position) => {
  return {
    pubId: 'X',
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
      let label;

      beforeEach(() => {
        label = service.getCitationType(
          [contribution('A1', 1)],
          [contribution('B1', 1)],
        );
      });

      it('is external', () => {
        expect(label).toBe('external');
      });
    });

    describe('when both lead authors are the same', () => {
      let label;

      beforeEach(() => {
        label = service.getCitationType(
          [contribution('A1', 1), contribution('A2', 2)],
          [contribution('A1', 1), contribution('C1', 2)],
        );
      });

      it('is a direct self citation', () => {
        expect(label).toBe('self-direct');
      });
    });

    describe('when the cited lead is a co-author of the citing paper', () => {
      let label;

      beforeEach(() => {
        label = service.getCitationType(
          [contribution('A1', 1)],
          [contribution('C1', 1), contribution('A1', 2)],
        );
      });

      it('is a co-author self citation', () => {
        expect(label).toBe('self-coauthor');
      });
    });

    describe('when only a non-lead author is shared', () => {
      let label;

      beforeEach(() => {
        label = service.getCitationType(
          [contribution('A1', 1), contribution('B1', 2)],
          [contribution('C1', 1), contribution('B1', 2)],
        );
      });

      it('is a co-author self citation', () => {
        expect(label).toBe('self-coauthor');
      });
    });
  });
});
