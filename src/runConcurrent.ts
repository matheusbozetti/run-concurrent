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
 * @param {number} [options.concurrency=5] - The maximum number of tasks running in parallel. (Default: 5)
 * @param {boolean} [options.stopOnError=true] - If `true`, execution stops at the first error. (Default: true)
 *
 * @returns {Promise<Array<T>> | Promise<{ data: Array<T | ConcurrencyError>, errorIndexes: number[] }>}
 *
 * - If `stopOnError` is `true` (or not provided), the function returns a **Promise resolving to an array of successful results only**.
 * - If `stopOnError` is `false`, the function returns a **Promise resolving to an object**:
 *   - `data`: An array where successful results are stored normally, but failed tasks contain a `ConcurrencyError` instance.
 *   - `errorIndexes`: An array of indices corresponding to failed tasks.
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
 * console.log(results); // [data1, data2, data3] (if all succeed)
 *
 * @example
 * // Running with concurrency 3 and continuing on errors
 * const results = await runConcurrent(tasks, { concurrency: 3, stopOnError: false });
 * console.log(results.data); // [data1, ConcurrencyError, data3]
 * console.log(results.errorIndexes); // [1] (if the second task failed)
 */
export async function runConcurrent<T extends unknown[]>(
  tasks: { [K in keyof T]: Task<T[K]> },
  options?: RunConcurrentOptions & { stopOnError?: true }
): Promise<{ [K in keyof T]: T[K] }>;

export async function runConcurrent<T extends unknown[]>(
  tasks: { [K in keyof T]: Task<T[K]> },
  options: RunConcurrentOptions & { stopOnError: false }
): Promise<{
  data: { [K in keyof T]: T[K] | ConcurrencyError };
  errorIndexes: number[];
}>;

export async function runConcurrent<T extends unknown[]>(
  tasks: { [K in keyof T]: Task<T[K]> },
  options: RunConcurrentOptions = {}
): Promise<
  | { [K in keyof T]: T[K] }
  | {
      data: { [K in keyof T]: T[K] | ConcurrencyError };
      errorIndexes: number[];
    }
> {
  const { concurrency = 5, stopOnError = true } = options;
  const results: any[] = new Array(tasks.length);
  const errorIndexes: number[] = [];
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
        const normalizedError =
          error instanceof Error
            ? error
            : new Error(String(error ?? "Unknown error"));

        if (stopOnError) {
          errorOccurred = true;
          throw new ConcurrencyError(normalizedError, index);
        }

        results[index] = new ConcurrencyError(normalizedError, index);
        errorIndexes.push(index);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (stopOnError) {
    return results as { [K in keyof T]: T[K] };
  }

  return { data: results as any, errorIndexes: errorIndexes.sort() };
}
