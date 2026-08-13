import { beforeEach, describe, expect, it } from '@jest/globals';
import { RetryStrategy } from '../RetryStrategy.js';

const createRetryStrategy = (overrides) =>
  new RetryStrategy({
    maxRetries: 2,
    shouldRetry: () =>
      true,
    delayMs: () =>
      0,
    sleep: async () => {},
    ...overrides,
  });

describe('RetryStrategy', () => {
  describe('run', () => {
    describe('when the function succeeds', () => {
      let calls;
      let result;

      beforeEach(async () => {
        calls = 0;
        result = await createRetryStrategy().run(async () => {
          calls += 1;
          return 'ok';
        });
      });

      it('returns the value', () => {
        expect(result).toBe('ok');
      });

      it('calls the function once', () => {
        expect(calls).toBe(1);
      });
    });

    describe('when the function keeps failing and the error is retryable', () => {
      let calls;
      let rejection;

      beforeEach(async () => {
        calls = 0;
        rejection = await createRetryStrategy().run(async () => {
          calls += 1;
          throw new Error('boom');
        })
          .catch((error) =>
            error);
      });

      it('gives up with the error', () => {
        expect(rejection.message).toBe('boom');
      });

      it('tries maxRetries + 1 times', () => {
        expect(calls).toBe(3);
      });
    });

    describe('when the error is not retryable', () => {
      let calls;

      beforeEach(async () => {
        calls = 0;
        await createRetryStrategy({
          shouldRetry: () =>
            false,
        }).run(async () => {
          calls += 1;
          throw new Error('nope');
        })
          .catch(() => {});
      });

      it('does not retry', () => {
        expect(calls).toBe(1);
      });
    });

    describe('when the function eventually succeeds', () => {
      let calls;
      let result;

      beforeEach(async () => {
        calls = 0;
        result = await createRetryStrategy().run(async () => {
          calls += 1;
          if (calls < 2) {
            throw new Error('retry');
          }
          return 'done';
        });
      });

      it('returns the eventual value', () => {
        expect(result).toBe('done');
      });

      it('stops calling once it succeeds', () => {
        expect(calls).toBe(2);
      });
    });

    describe('the retry condition', () => {
      let seen;

      beforeEach(async () => {
        const shouldRetry = (error) => {
          seen = error;
          return false;
        };
        await createRetryStrategy({ shouldRetry: shouldRetry }).run(async () => {
          throw new Error('specific');
        })
          .catch(() => {});
      });

      it('receives the thrown error', () => {
        expect(seen.message).toBe('specific');
      });
    });
  });
});
