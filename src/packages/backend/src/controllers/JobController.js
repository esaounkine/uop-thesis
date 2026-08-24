import { ApiError } from '../lib/api.js';

/**
 * Controller for long-running tasks, where a job is created
 * and instantly returned; job status then can be requested
 * and fetched asynchronously.
 */
export class JobController {
  constructor(providers, jobService, storedMetricsService) {
    this.providers = providers;
    this.jobService = jobService;
    this.storedMetricsService = storedMetricsService;
  }

  submitJob({ body }) {
    const {
      provider: providerId, id, cache = true,
    } = body ?? {};
    const provider = this.providers.find((each) =>
      each.id === providerId);

    if (!provider || !id) {
      throw new ApiError(400, 'body must contain `provider` and `id`');
    }

    const requestId = this.jobService.submitJob(
      () =>
        provider.metricsService.getAuthorMetrics(id, { cache: cache }),
      {
        queue: provider.queue,
        kind: 'author',
        provider: provider.id,
        subjectId: id,
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

  /**
   * Get stored metrics graph for an author.
   */
  getStoredMetrics({ params }) {
    const stored = this.storedMetricsService
      .getStoredMetrics(params.provider, params.authorId);

    if (!stored) {
      throw new ApiError(404, 'no stored metrics for this author');
    }

    return stored.result;
  }
}
