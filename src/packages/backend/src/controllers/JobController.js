import { ApiError } from '../lib/api.js';

/**
 * Controller for long-running tasks, where a job is created
 * and instantly returned; job status then can be requested
 * and fetched asynchronously.
 */
export class JobController {
  constructor(providers, jobService) {
    this.providers = providers;
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

    const provider = this.providers.find((p) =>
      p.id === providerId);

    if (!provider) {
      throw new ApiError(404, `unknown provider: ${providerId}`);
    }

    const requestId = this.jobService.submitJob(
      () =>
        provider.metricsService
          .getAuthorMetrics(provider.id, authorId, { cache: cache }),
      {
        queue: provider.queue,
        provider: provider.id,
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
