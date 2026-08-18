import { desc, eq } from 'drizzle-orm';
import { jobs } from '../db/schema.js';
import { JOB_STATUS } from '../constants/job-status.js';

/**
 * Persists jobs.
 */
export class JobRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {Object} job - the full job row to insert
   */
  createJob(job) {
    this.db
      .insert(jobs)
      .values(job)
      .run();
  }

  /**
   * @param {string} id
   * @param {Object} patch - fields to update (status, progress, result, error)
   */
  updateJob(id, patch) {
    this.db
      .update(jobs)
      .set({
        ...patch,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, id))
      .run();
  }

  /**
   * @param {string} id
   * @returns {Object | undefined}
   */
  findJobById(id) {
    return this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id))
      .get();
  }

  /**
   * @returns {Object[]} all jobs, newest first
   */
  findAllJobs() {
    return this.db
      .select()
      .from(jobs)
      .orderBy(desc(jobs.createdAt))
      .all();
  }

  /**
   * Marks leftover running jobs as interrupted (a restart kills their queue).
   *
   * @returns {number} how many jobs were interrupted
   */
  interruptRunningJobs() {
    const leftover = this.db
      .select()
      .from(jobs)
      .where(eq(jobs.status, JOB_STATUS.RUNNING))
      .all();

    leftover.forEach((job) => {
      this.updateJob(job.id, {
        status: JOB_STATUS.INTERRUPTED,
        error: 'server restarted while the job was running',
      });
    });

    return leftover.length;
  }
}
