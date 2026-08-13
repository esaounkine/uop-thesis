/**
 * Loans a live progress reporter around an async operation.
 * The queue is any event emitter that exposes `pending` and `size` counters.
 *
 * @template T
 * @param {({ on: Function, off: Function, pending: number, size: number }) | undefined} queue
 * @param {() => Promise<T>} fn - the function to call
 * @param {(status: { completed: number, pending: number, queued: number }) => void} [onProgress] - callback after each completed step
 * @param {(completed: number) => void} [onDone] - callback when fn settles
 * @returns {Promise<T>} the result of fn
 */
export const withQueueProgressReport = async (
  queue,
  fn,
  onProgress = ({
    completed, pending, queued,
  }) => {
    process.stderr.write(
      `\rqueue | done: ${completed}  running: ${pending}  queued: ${queued}   `,
    );
  },
  onDone = (completed) => {
    if (completed > 0) {
      process.stderr.write('\n');
    }
  },
) => {
  if (!queue) {
    return fn();
  }

  let completed = 0;
  const _onCompleted = () => {
    completed += 1;

    onProgress({
      completed: completed,
      pending: queue.pending,
      queued: queue.size,
    });
  };

  queue.on('completed', _onCompleted);

  try {
    return await fn();
  } finally {
    queue.off('completed', _onCompleted);
    onDone(completed);
  }
};
