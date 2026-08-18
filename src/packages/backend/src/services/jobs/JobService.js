import { randomUUID } from 'node:crypto';
import { JOB_STATUS } from '../../constants/job-status.js';

/**
 * Executes long-running tasks asynchronously and tracks their progress.
 */
export class JobService {
  /**
   * @param {import('../../repositories/JobRepository.js').JobRepository} jobRepository
   */
  constructor(jobRepository) {
    this.jobRepository = jobRepository;
    this.running = new Map();
    this.jobRepository.interruptRunningJobs();
  }

  /**
   * @param {() => Promise<any>} run
   * @param {import('../../lib/RequestQueue.js').RequestQueue} queue
   * @param {Object} [meta] - fields stored on the job; a `queue` reports progress
   * @returns {string} the requestId
   */
  submitJob(run, {
    queue, ...meta
  } = {}) {
    const id = randomUUID();
    const job = {
      id: id,
      ...meta,
      status: JOB_STATUS.RUNNING,
      progress: {
        done: 0,
        running: 0,
        queued: 0,
      },
      result: null,
      error: null,
    };
    const now = new Date().toISOString();

    this.jobRepository.createJob({
      ...job,
      createdAt: now,
      updatedAt: now,
    });
    this.running.set(id, job);

    const onTaskCompleted = () => {
      job.progress = {
        done: job.progress.done + 1,
        running: queue.pending,
        queued: queue.size,
      };
    };
    queue?.onTaskCompleted(onTaskCompleted);

    run()
      .then((result) => {
        job.status = JOB_STATUS.DONE;
        job.result = result;
        this.jobRepository.updateJob(id, {
          status: JOB_STATUS.DONE,
          progress: job.progress,
          result: result,
        });
      })
      .catch((error) => {
        job.status = JOB_STATUS.ERROR;
        job.error = error.message;
        this.jobRepository.updateJob(id, {
          status: JOB_STATUS.ERROR,
          progress: job.progress,
          error: error.message,
        });
      })
      .finally(() => {
        queue?.offTaskCompleted(onTaskCompleted);
        this.running.delete(id);
      });

    return id;
  }

  /**
   * @param {string} id
   * @returns {Object | undefined}
   */
  getJob(id) {
    return this.running.get(id) ?? this.jobRepository.findJobById(id);
  }

  /**
   * @returns {Object[]} all jobs, newest first
   */
  listJobs() {
    return this.jobRepository
      .findAllJobs()
      .map((job) =>
        this.running.get(job.id) ?? job);
  }
}
