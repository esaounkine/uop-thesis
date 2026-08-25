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
      provider: providerId, id, cache = true,
    } = body ?? {};
    const provider = this.providers.find((each) =>
      each.id === providerId);

    if (!provider || !id) {
      throw new ApiError(400, 'body must contain `provider` and `id`');
    }

    const requestId = this.jobService.submitJob(
      () =>
        provider.metricsService
          .getAuthorMetrics(provider.id, id, { cache: cache }),
      {
        queue: provider.queue,
        provider: provider.id,
        authorId: id,
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
    const provider = this.providers.find((each) =>
      each.id === params.provider);
    const tree = provider?.citationGraphService
      .getAuthorTree(params.provider, params.authorId);

    if (!tree) {
      throw new ApiError(404, 'no stored metrics for this author');
    }

    return {
      author: tree.author,
      metrics: provider.classificationService.getMetrics(
        tree.publications.flatMap((entry) =>
          entry.citations.map((citation) =>
            citation.classification)),
      ),
      publications: tree.publications,
    };
  }
}
