import ConcurrencyError from "./errors/ConcurrencyError.js";

type Task<T> = () => Promise<T>;

interface RunConcurrentOptions {
  concurrency?: number;
  stopOnError?: boolean;
}

/**
 * Runs a set of asynchronous tasks with configurable concurrency.
 *
 * @template T The type of the task return values.
 * @param {Array<() => Promise<T>>} tasks - An array of asynchronous functions to execute.
 * @param {Object} [options] - Configuration options for concurrency control.
 * @param {number} [options.concurrency=1] - The maximum number of tasks running in parallel.
 * @param {boolean} [options.stopOnError=true] - If `true`, execution stops at the first error.
 *
 * @returns {Promise<Array<T | ConcurrencyError>>} A promise resolving to an array of results.
 *
 * - If `stopOnError` is `true`, the function returns an array of successful results **only**, since execution stops on error.
 * - If `stopOnError` is `false`, the array may contain `ConcurrencyError` instances for failed tasks.
 *
 * @throws {ConcurrencyError} If `stopOnError` is `true` and a task fails, the function throws a concurrency error.
 *
 * @example
 * // Running three tasks with concurrency 2, stopping on error
 * const tasks = [
 *   async () => await fetchData(1),
 *   async () => await fetchData(2),
 *   async () => await fetchData(3),
 * ];
 * const results = await runConcurrent(tasks, { concurrency: 2, stopOnError: true });
 *
 * @example
 * // Running with concurrency 3 and continuing on errors
 * const results = await runConcurrent(tasks, { concurrency: 3, stopOnError: false });
 * results.forEach((result, index) => {
 *   if (result instanceof ConcurrencyError) {
 *     console.error(`Task ${index} failed:`, result.message);
 *   } else {
 *     console.log(`Task ${index} result:`, result);
 *   }
 * });
 */
export async function runConcurrent<T extends unknown[]>(
  tasks: { [K in keyof T]: Task<T[K]> },
  options: RunConcurrentOptions & { stopOnError: false }
): Promise<{ [K in keyof T]: T[K] | ConcurrencyError }>;
export async function runConcurrent<T extends unknown[]>(
  tasks: { [K in keyof T]: Task<T[K]> },
  options?: RunConcurrentOptions & { stopOnError?: true }
): Promise<{ [K in keyof T]: T[K] }>;
export async function runConcurrent<T extends unknown[]>(
  tasks: { [K in keyof T]: Task<T[K]> },
  options: RunConcurrentOptions = {}
): Promise<{ [K in keyof T]: T[K] | ConcurrencyError }> {
  const { concurrency = 1, stopOnError = true } = options;
  const results: any[] = new Array(tasks.length);
  let errorOccurred = false;

  const queue = tasks.map((task, index) => ({ task, index }));

  const worker = async () => {
    while (queue.length > 0 && (!stopOnError || !errorOccurred)) {
      const item = queue.shift();
      if (!item) return;

      const { task, index } = item;

      try {
        results[index] = await task();
      } catch (error) {
        if (!(error instanceof Error)) {
          throw new ConcurrencyError(String(error), index);
        }

        if (stopOnError) {
          errorOccurred = true;
          throw new ConcurrencyError(error.message, index, error.stack);
        }
        results[index] = new ConcurrencyError(
          error.message,
          index,
          error.stack
        );
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return results as any;
}
