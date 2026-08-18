import { EventEmitter } from 'node:events';
import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { withQueueProgressReport } from '../queue-progress.js';

const createMockQueue = () => {
  const queue = new EventEmitter();
  queue.pending = 2;
  queue.size = 3;
  queue.onCompleted = (listener) =>
    queue.on('completed', listener);
  queue.offCompleted = (listener) =>
    queue.off('completed', listener);
  return queue;
};

describe('withQueueProgressReport', () => {
  let onProgressMock;
  let onDoneMock;

  beforeEach(() => {
    onProgressMock = jest.fn();
    onDoneMock = jest.fn();
  });

  describe('when there is no queue', () => {
    let result;

    beforeEach(async () => {
      result = await withQueueProgressReport(undefined, async () =>
        'value', 'openalex', onProgressMock, onDoneMock);
    });

    it('runs the function and returns its result', () => {
      expect(result).toBe('value');
    });

    it('does not report progress', () => {
      expect(onProgressMock).not.toHaveBeenCalled();
    });
  });

  describe('when a queue is provided', () => {
    let queue;

    beforeEach(() => {
      queue = createMockQueue();
    });

    describe('and the function succeeds', () => {
      let result;

      beforeEach(async () => {
        result = await withQueueProgressReport(queue, async () => {
          queue.emit('completed');
          return 'done';
        }, 'openalex', onProgressMock, onDoneMock);
      });

      it('returns the result', () => {
        expect(result).toBe('done');
      });

      it('reports the queue status on each completed request', () => {
        expect(onProgressMock).toHaveBeenCalledWith({
          completed: 1,
          pending: 2,
          queued: 3,
        });
      });

      it('reports done with the completed count', () => {
        expect(onDoneMock).toHaveBeenCalledWith(1);
      });

      it('detaches the listener afterwards', () => {
        expect(queue.listenerCount('completed')).toBe(0);
      });
    });

    describe('and the function throws', () => {
      let rejection;

      beforeEach(async () => {
        rejection = await withQueueProgressReport(queue, async () => {
          throw new Error('err');
        }, 'openalex', onProgressMock, onDoneMock).catch((error) =>
          error);
      });

      it('rethrows the error', () => {
        expect(rejection.message).toBe('err');
      });

      it('still reports done', () => {
        expect(onDoneMock).toHaveBeenCalledWith(0);
      });

      it('still detaches the listener', () => {
        expect(queue.listenerCount('completed')).toBe(0);
      });
    });
  });
});
