import { ApiError } from '../lib/api.js';

/**
 * Controller for long-running tasks, where a job is created
 * and instantly returned; job status then can be requested
 * and fetched asynchronously.
 */
export class JobController {
  /**
   * @param {import('../services/metrics/MetricsService.js').MetricsService} metricsService
   * @param {import('../services/jobs/JobService.js').JobService} jobService
   */
  constructor(metricsService, jobService) {
    this.metricsService = metricsService;
    this.jobService = jobService;
  }

  submitJob({ body }) {
    const {
      provider: providerId,
      id: authorId,
      cache = true,
    } = body ?? {};

    if (!providerId || !authorId) {
      throw new ApiError(400, 'body must contain `provider` and `id`');
    }

    const requestId = this.jobService.submitJob(
      () =>
        this.metricsService
          .getAuthorMetrics(providerId, authorId, { cache: cache }),
      {
        providerId: providerId,
        authorId: authorId,
      },
    );

    return {
      requestId: requestId,
    };
  }

  getJob({ params }) {
    const job = this.jobService.getJob(params.id);

    if (!job) {
      throw new ApiError(404, 'job not found');
    }

    return job;
  }

  listJobs() {
    return this.jobService.listJobs();
  }
}
