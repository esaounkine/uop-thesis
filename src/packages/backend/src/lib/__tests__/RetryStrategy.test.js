import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
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
      let fnMock;
      let result;

      beforeEach(async () => {
        fnMock = jest.fn().mockResolvedValue('ok');
        result = await createRetryStrategy().run(fnMock);
      });

      it('returns the value', () => {
        expect(result).toBe('ok');
      });

      it('calls the function once', () => {
        expect(fnMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the function keeps failing and the error is retryable', () => {
      let fnMock;
      let rejection;

      beforeEach(async () => {
        fnMock = jest.fn().mockRejectedValue(new Error('boom'));
        rejection = await createRetryStrategy().run(fnMock)
          .catch((error) =>
            error);
      });

      it('gives up with the error', () => {
        expect(rejection.message).toBe('boom');
      });

      it('tries maxRetries + 1 times', () => {
        expect(fnMock).toHaveBeenCalledTimes(3);
      });
    });

    describe('when the error is not retryable', () => {
      let fnMock;

      beforeEach(async () => {
        fnMock = jest.fn().mockRejectedValue(new Error('nope'));
        await createRetryStrategy({
          shouldRetry: () =>
            false,
        }).run(fnMock)
          .catch(() => {});
      });

      it('does not retry', () => {
        expect(fnMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the function eventually succeeds', () => {
      let fnMock;
      let result;

      beforeEach(async () => {
        fnMock = jest.fn()
          .mockRejectedValueOnce(new Error('retry'))
          .mockResolvedValue('done');
        result = await createRetryStrategy().run(fnMock);
      });

      it('returns the eventual value', () => {
        expect(result).toBe('done');
      });

      it('stops calling once it succeeds', () => {
        expect(fnMock).toHaveBeenCalledTimes(2);
      });
    });

    describe('the retry condition', () => {
      let shouldRetryMock;

      beforeEach(async () => {
        shouldRetryMock = jest.fn(() =>
          false);
        const fnMock = jest.fn().mockRejectedValue(new Error('specific'));
        await createRetryStrategy({ shouldRetry: shouldRetryMock }).run(fnMock)
          .catch(() => {});
      });

      it('receives the thrown error', () => {
        const [error] = shouldRetryMock.mock.calls[0];
        expect(error.message).toBe('specific');
      });
    });
  });
});
