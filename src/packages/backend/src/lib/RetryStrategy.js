const defaultSleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Runs a function and retries if it fails.
 */
export class RetryStrategy {
  /**
   * @param {Object} strategy
   * @param {number} strategy.maxRetries
   * @param {(error: any) => boolean} strategy.shouldRetry - inspect the error to decide
   * @param {(error: any, attempt: number) => number} strategy.delayMs - wait before the next attempt
   * @param {(ms: number) => Promise<void>} [strategy.sleep]
   */
  constructor({
    maxRetries,
    shouldRetry,
    delayMs,
    sleep = defaultSleep,
  }) {
    this.maxRetries = maxRetries;
    this.shouldRetry = shouldRetry;
    this.delayMs = delayMs;
    this.sleep = sleep;
  }

  /**
   * @template T
   * @param {() => Promise<T>} fn
   * @param {number} [attempt]
   * @returns {Promise<T>}
   */
  async run(fn, attempt = 0) {
    try {
      return await fn();
    } catch (error) {
      if (attempt < this.maxRetries && this.shouldRetry(error)) {
        await this.sleep(this.delayMs(error, attempt));

        return this.run(fn, attempt + 1);
      }

      throw error;
    }
  }
}
