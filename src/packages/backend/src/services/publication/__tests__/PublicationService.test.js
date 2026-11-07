import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { PublicationService } from '../PublicationService.js';

describe('PublicationService', () => {
  let connectorMock;
  let publicationService;

  beforeEach(() => {
    connectorMock = {
      id: 'openalex',
      getCitations: jest.fn(),
    };
    publicationService = new PublicationService([connectorMock]);
  });

  describe('getCitations', () => {
    describe('when the provider is unknown', () => {
      it('is a 404', async () => {
        await expect(publicationService.getCitations('nope', 'W1'))
          .rejects.toThrow('unknown provider: nope');
      });
    });

    describe('when the provider returns citations', () => {
      const citations = [{ pubId: 'W2' }, { pubId: 'W3' }];

      beforeEach(() => {
        connectorMock.getCitations.mockResolvedValue(citations);
      });

      it('returns the citing publications', async () => {
        expect(await publicationService.getCitations('openalex', 'W1'))
          .toBe(citations);
      });

      describe('and the cache is enabled (default)', () => {
        it('uses the cache', async () => {
          await publicationService.getCitations('openalex', 'W1');

          expect(connectorMock.getCitations)
            .toHaveBeenCalledWith('W1', { cache: true });
        });
      });

      describe('and the cache is disabled', () => {
        it('skips the cache', async () => {
          await publicationService.getCitations('openalex', 'W1', { cache: false });

          expect(connectorMock.getCitations)
            .toHaveBeenCalledWith('W1', { cache: false });
        });
      });
    });

    describe('when the provider rejects', () => {
      beforeEach(() => {
        connectorMock.getCitations.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(publicationService.getCitations('openalex', 'W1'))
          .rejects.toThrow('error-1');
      });
    });
  });
});
