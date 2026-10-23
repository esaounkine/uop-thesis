import PQueue from 'p-queue';

/**
 * Paces async tasks and reports their progress.
 */
export class RequestQueue {
  /**
   * @param {Object} args
   * @param {number} args.requestsPerSecond - max tasks started per second
   */
  constructor({ requestsPerSecond }) {
    this.requestsPerSecond = requestsPerSecond;
    this.queue = new PQueue({
      interval: 1000,
      intervalCap: requestsPerSecond,
    });
  }

  /**
   * Runs the task when the pace allows.
   *
   * @param {() => Promise<any>} task
   * @returns {Promise<any>} the task result
   */
  add(task) {
    return this.queue.add(task);
  }

  /**
   * Subscribe a listener to the task completion.
   *
   * @param {() => void} listener - called after each finished task
   */
  onTaskCompleted(listener) {
    this.queue.on('completed', listener);
  }

  /**
   * Unsubscribe a listener from the task completion.
   *
   * @param {() => void} listener - identity (reference) of the listener to stop calling after each finished task
   */
  offTaskCompleted(listener) {
    this.queue.off('completed', listener);
  }

  /**
   * @returns {number} tasks currently running
   */
  get pending() {
    return this.queue.pending;
  }

  /**
   * @returns {number} tasks waiting for a free slot
   */
  get size() {
    return this.queue.size;
  }
}
