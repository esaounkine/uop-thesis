import { ApiError } from '../lib/api.js';

/**
 * Controller for long-running tasks, where a job is created
 * and instantly returned; job status then can be requested
 * and fetched asynchronously.
 */
export class JobController {
  constructor(providers, jobs) {
    this.providers = providers;
    this.jobs = jobs;
  }

  submitJob({ body }) {
    const {
      provider: providerId, id,
    } = body ?? {};
    const provider = this.providers.find((each) =>
      each.id === providerId);

    if (!provider || !id) {
      throw new ApiError(400, 'body must contain `provider` and `id`');
    }

    const requestId = this.jobs.submitJob(() =>
      provider.classification.getAuthorMetrics(id), {
      queue: provider.queue,
      kind: 'author',
      provider: provider.id,
      subjectId: id,
    });

    return {
      requestId: requestId,
    };
  }

  getJob({ params }) {
    const job = this.jobs.getJob(params.id);

    if (!job) {
      throw new ApiError(404, 'job not found');
    }

    return job;
  }

  listJobs() {
    return this.jobs.listJobs();
  }
}
