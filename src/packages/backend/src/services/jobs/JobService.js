import { randomUUID } from 'node:crypto';

/**
 * Executes long-running tasks asynchronously and tracks their progress.
 */
export class JobService {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * @param {() => Promise<any>} run
   * @param {import('p-queue').default} queue
   * @param {Object} [meta] - fields stored on the job; a `queue` reports progress
   * @returns {string} the requestId
   */
  submit(run, {
    queue, ...meta
  } = {}) {
    const id = randomUUID();
    const job = {
      id: id,
      ...meta,
      status: 'running',
      progress: {
        done: 0,
        running: 0,
        queued: 0,
      },
      result: null,
      error: null,
    };
    this.jobs.set(id, job);

    const onCompleted = () => {
      job.progress = {
        done: job.progress.done + 1,
        running: queue.pending,
        queued: queue.size,
      };
    };
    queue?.on('completed', onCompleted);

    run()
      .then((result) => {
        job.status = 'done';
        job.result = result;
      })
      .catch((error) => {
        job.status = 'error';
        job.error = error.message;
      })
      .finally(() => {
        queue?.off('completed', onCompleted);
      });

    return id;
  }

  /**
   * @param {string} id
   * @returns {Object | undefined}
   */
  get(id) {
    return this.jobs.get(id);
  }
}
