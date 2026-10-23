import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { RetryStrategy } from '../RetryStrategy.js';

describe('RetryStrategy', () => {
  let fnMock;
  let strategy;

  const createStrategy = (overrides) =>
    new RetryStrategy({
      maxRetries: 2,
      shouldRetry: () =>
        true,
      delayMs: () =>
        0,
      sleep: async () => {},
      ...overrides,
    });

  beforeEach(() => {
    fnMock = jest.fn();
    strategy = createStrategy();
  });

  describe('run', () => {
    describe('when the function succeeds', () => {
      beforeEach(() => {
        fnMock.mockResolvedValue('ok');
      });

      it('returns the value', async () => {
        expect(await strategy.run(fnMock)).toBe('ok');
      });

      it('calls the function once', async () => {
        await strategy.run(fnMock);
        expect(fnMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the function fails', () => {
      describe('but the error is not retryable', () => {
        let shouldRetryMock;

        beforeEach(() => {
          shouldRetryMock = jest.fn(() =>
            false);
          strategy = createStrategy({
            shouldRetry: shouldRetryMock,
          });
          fnMock.mockRejectedValue(new Error('error-1'));
        });

        it('does not retry', async () => {
          await strategy.run(fnMock).catch(() => {});
          expect(fnMock).toHaveBeenCalledTimes(1);
        });

        it('passes the error to the retry check', async () => {
          await strategy.run(fnMock).catch(() => {});
          const [error] = shouldRetryMock.mock.calls[0];
          expect(error.message).toBe('error-1');
        });
      });

      describe('and the error is retryable', () => {
        describe('and a retry succeeds', () => {
          beforeEach(() => {
            fnMock
              .mockRejectedValueOnce(new Error('error-2'))
              .mockResolvedValue('done');
          });

          it('returns the eventual value', async () => {
            expect(await strategy.run(fnMock)).toBe('done');
          });

          it('stops calling once it succeeds', async () => {
            await strategy.run(fnMock);
            expect(fnMock).toHaveBeenCalledTimes(2);
          });
        });

        describe('but the retries are exhausted', () => {
          beforeEach(() => {
            fnMock.mockRejectedValue(new Error('error-3'));
          });

          it('gives up with the error', async () => {
            await expect(strategy.run(fnMock)).rejects.toThrow('error-3');
          });

          it('tries maxRetries + 1 times', async () => {
            await strategy.run(fnMock).catch(() => {});
            expect(fnMock).toHaveBeenCalledTimes(3);
          });
        });
      });
    });
  });
});
