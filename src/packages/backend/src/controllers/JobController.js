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
      kind, provider: providerId, id,
    } = body ?? {};
    const provider = this.providers.find((each) =>
      each.id === providerId);

    if (!provider || !id) {
      throw new ApiError(400, 'body must be { kind, provider, id }');
    }

    let run;
    switch (kind) {
      case 'paper':
        run = () =>
          provider.classification.getPaperMetrics(id);
        break;
      case 'author':
        run = () =>
          provider.classification.getAuthorMetrics(id);
        break;
      default:
        throw new ApiError(400, `unknown kind "${kind}"`);
    }

    const requestId = this.jobs.submitJob(run, {
      queue: provider.queue,
      kind: kind,
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
