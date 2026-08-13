import { EventEmitter } from 'node:events';
import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { withQueueProgressReport } from '../queue-progress.js';

const createMockQueue = () => {
  const queue = new EventEmitter();
  queue.pending = 2;
  queue.size = 3;
  return queue;
};

describe('withQueueProgressReport', () => {
  let onProgress;
  let onDone;

  beforeEach(() => {
    onProgress = jest.fn();
    onDone = jest.fn();
  });

  describe('when there is no queue', () => {
    let result;

    beforeEach(async () => {
      result = await withQueueProgressReport(undefined, async () =>
        'value', onProgress, onDone);
    });

    it('runs the function and returns its result', () => {
      expect(result).toBe('value');
    });

    it('does not report progress', () => {
      expect(onProgress).not.toHaveBeenCalled();
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
        }, onProgress, onDone);
      });

      it('returns the result', () => {
        expect(result).toBe('done');
      });

      it('reports the queue status on each completed request', () => {
        expect(onProgress).toHaveBeenCalledWith({
          completed: 1,
          pending: 2,
          queued: 3,
        });
      });

      it('reports done with the completed count', () => {
        expect(onDone).toHaveBeenCalledWith(1);
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
        }, onProgress, onDone).catch((error) =>
          error);
      });

      it('rethrows the error', () => {
        expect(rejection.message).toBe('err');
      });

      it('still reports done', () => {
        expect(onDone).toHaveBeenCalledWith(0);
      });

      it('still detaches the listener', () => {
        expect(queue.listenerCount('completed')).toBe(0);
      });
    });
  });
});
