/**
 * Loans a live progress reporter around an async operation.
 *
 * @template T
 * @param {import('./RequestQueue.js').RequestQueue | undefined} queue
 * @param {() => Promise<T>} fn - the function to call
 * @param {string} [label] - name of the queue to prefix the status line
 * @param {(status: { completed: number, pending: number, queued: number }) => void} [onProgress] - callback after each completed step
 * @param {(completed: number) => void} [onDone] - callback when fn settles
 * @returns {Promise<T>} the result of fn
 */
export const withQueueProgressReport = async (
  queue,
  fn,
  label = 'queue',
  onProgress = ({
    completed, pending, queued,
  }) => {
    process.stderr.write(
      `\r${label} | done: ${completed}  running: ${pending}  queued: ${queued}   `,
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
  const _onTaskCompleted = () => {
    completed += 1;

    onProgress({
      completed: completed,
      pending: queue.pending,
      queued: queue.size,
    });
  };

  queue.onTaskCompleted(_onTaskCompleted);

  try {
    return await fn();
  } finally {
    queue.offTaskCompleted(_onTaskCompleted);
    onDone(completed);
  }
};
