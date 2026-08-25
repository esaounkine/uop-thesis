import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { PublicationService } from '../PublicationService.js';

describe('PublicationService', () => {
  let connectorMock;
  let publicationService;

  beforeEach(() => {
    connectorMock = {
      getCitations: jest.fn(),
    };
    publicationService = new PublicationService({
      connector: connectorMock,
    });
  });

  describe('getCitations', () => {
    describe('when the connector returns citations', () => {
      const citations = [{ pubId: 'W2' }, { pubId: 'W3' }];

      beforeEach(() => {
        connectorMock.getCitations.mockResolvedValue(citations);
      });

      it('returns the citing publications', async () => {
        expect(await publicationService.getCitations('W1')).toBe(citations);
      });

      describe('and the cache is enabled (default)', () => {
        it('uses the cache', async () => {
          await publicationService.getCitations('W1');

          expect(connectorMock.getCitations)
            .toHaveBeenCalledWith('W1', { cache: true });
        });
      });

      describe('and the cache is disabled', () => {
        it('skips the cache', async () => {
          await publicationService.getCitations('W1', { cache: false });

          expect(connectorMock.getCitations)
            .toHaveBeenCalledWith('W1', { cache: false });
        });
      });
    });

    describe('when the connector rejects', () => {
      beforeEach(() => {
        connectorMock.getCitations.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(publicationService.getCitations('W1'))
          .rejects.toThrow('error-1');
      });
    });
  });
});
