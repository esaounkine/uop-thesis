import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { withQueueProgressReport } from '../queue-progress.js';

describe('withQueueProgressReport', () => {
  let onProgressMock;
  let onDoneMock;

  const report = (queue, task) =>
    withQueueProgressReport(queue, task, 'queue', onProgressMock, onDoneMock);

  beforeEach(() => {
    onProgressMock = jest.fn();
    onDoneMock = jest.fn();
  });

  describe('when there is no queue', () => {
    let task;

    beforeEach(() => {
      task = jest.fn().mockResolvedValue('value');
    });

    it('runs the function and returns its result', async () => {
      expect(await report(undefined, task)).toBe('value');
    });

    it('does not report progress', async () => {
      await report(undefined, task);
      expect(onProgressMock).not.toHaveBeenCalled();
    });
  });

  describe('when a queue is provided', () => {
    let queueMock;

    beforeEach(() => {
      queueMock = {
        onTaskCompleted: jest.fn(),
        offTaskCompleted: jest.fn(),
        pending: 2,
        size: 3,
      };
    });

    describe('and the function succeeds', () => {
      let task;

      beforeEach(() => {
        task = jest.fn(async () => {
          const [onCompleted] = queueMock.onTaskCompleted.mock.calls[0];
          onCompleted();
          return 'done';
        });
      });

      it('returns the result', async () => {
        expect(await report(queueMock, task)).toBe('done');
      });

      it('reports the queue status on each completed request', async () => {
        await report(queueMock, task);
        expect(onProgressMock).toHaveBeenCalledWith({
          completed: 1,
          pending: 2,
          queued: 3,
        });
      });

      it('reports done with the completed count', async () => {
        await report(queueMock, task);
        expect(onDoneMock).toHaveBeenCalledWith(1);
      });

      it('detaches the listener afterwards', async () => {
        await report(queueMock, task);
        const [registered] = queueMock.onTaskCompleted.mock.calls[0];
        expect(queueMock.offTaskCompleted).toHaveBeenCalledWith(registered);
      });
    });

    describe('but the function throws', () => {
      let task;

      beforeEach(() => {
        task = jest.fn().mockRejectedValue(new Error('error-1'));
      });

      it('rethrows the error', async () => {
        await expect(report(queueMock, task)).rejects.toThrow('error-1');
      });

      it('reports done', async () => {
        await report(queueMock, task).catch(() => {});
        expect(onDoneMock).toHaveBeenCalledWith(0);
      });

      it('detaches the listener', async () => {
        await report(queueMock, task).catch(() => {});
        const [registered] = queueMock.onTaskCompleted.mock.calls[0];
        expect(queueMock.offTaskCompleted).toHaveBeenCalledWith(registered);
      });
    });
  });
});
