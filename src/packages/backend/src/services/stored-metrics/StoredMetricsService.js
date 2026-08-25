import { JOB_STATUS } from '../../constants/job-status.js';

/**
 * Reads the stored metrics.
 * Stored metrics are results of the last completed job.
 */
export class StoredMetricsService {
  /**
   * @param {import('../../repositories/JobRepository.js').JobRepository} jobRepository
   */
  constructor(jobRepository) {
    this.jobRepository = jobRepository;
  }

  /**
   * @param {string} provider
   * @param {string} authorId
   * @returns {Object | null} the last completed job for the author
   */
  getStoredMetrics(provider, authorId) {
    return this.jobRepository.findJob({
      provider: provider,
      authorId: authorId,
      status: JOB_STATUS.DONE,
    }) ?? null;
  }
}
