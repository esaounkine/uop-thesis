import { EventEmitter } from 'node:events';
import {
  beforeEach, describe, expect, it,
} from '@jest/globals';
import { JobService } from '../JobService.js';

const completeTask = () =>
  new Promise((resolve) =>
    setImmediate(resolve));

describe('JobService', () => {
  let jobs;

  beforeEach(() => {
    jobs = new JobService();
  });

  describe('when the task succeeds', () => {
    let id;

    beforeEach(async () => {
      id = jobs.submit(async () =>
        'metrics', {
        kind: 'paper',
        provider: 'openalex',
      });
      await completeTask();
    });

    it('marks the job done with its result and metadata', () => {
      expect(jobs.get(id)).toMatchObject({
        status: 'done',
        result: 'metrics',
        kind: 'paper',
        provider: 'openalex',
      });
    });
  });

  describe('when the work fails', () => {
    let id;

    beforeEach(async () => {
      id = jobs.submit(async () => {
        throw new Error('boom');
      });
      await completeTask();
    });

    it('marks the job as errored with the message', () => {
      expect(jobs.get(id)).toMatchObject({
        status: 'error',
        error: 'boom',
      });
    });
  });

  describe('progress', () => {
    it('advances on each queue completed event', async () => {
      const queue = Object.assign(new EventEmitter(), {
        pending: 2,
        size: 5,
      });
      const id = jobs.submit(async () => {
        queue.emit('completed');
        queue.emit('completed');
      }, { queue: queue });
      await completeTask();

      expect(jobs.get(id).progress).toEqual({
        done: 2,
        running: 2,
        queued: 5,
      });
    });
  });

  describe('when the id is unknown', () => {
    it('returns undefined', () => {
      expect(jobs.get('nope')).toBeUndefined();
    });
  });
});
