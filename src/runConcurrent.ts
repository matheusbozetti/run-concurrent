import ConcurrencyError from "./errors/ConcurrencyError.js";

type Task<T> = () => Promise<T>;

interface RunConcurrentOptions {
  concurrency?: number;
  stopOnError?: boolean;
  throwOriginalError?: boolean;
}

/**
 * Runs a set of asynchronous tasks with configurable concurrency.
 *
 * @template T The type of the task return values.
 * @param {Array<() => Promise<T>>} tasks - An array of asynchronous functions to execute.
 * @param {Object} [options] - Configuration options for concurrency control.
 * @param {number} [options.concurrency=5] - The maximum number of tasks running in parallel. (Default: 5)
 * @param {boolean} [options.stopOnError=true] - If `true`, execution stops at the first error. (Default: true)
 * @param {boolean} [options.throwOriginalError=false] - If `true`, throws or stores the original error instead of wrapping it in a `ConcurrencyError`. (Default: false)
 *
 * @returns {Promise<Array<T>> | Promise<{ data: Array<T | ConcurrencyError>, errorIndexes: number[] }>}
 *
 * - If `stopOnError` is `true` (or not provided), the function returns a **Promise resolving to an array of successful results only**.
 * - If `stopOnError` is `false`, the function returns a **Promise resolving to an object**:
 *   - `data`: An array where successful results are stored normally, but failed tasks contain a `ConcurrencyError` (or the original `Error` if `throwOriginalError` is `true`).
 *   - `errorIndexes`: An array of indices corresponding to failed tasks.
 *
 * @throws {ConcurrencyError} If `stopOnError` is `true` and a task fails, the function throws a `ConcurrencyError` (or the original error if `throwOriginalError` is `true`).
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
  options: RunConcurrentOptions & { stopOnError: false; throwOriginalError: true }
): Promise<{
  data: { [K in keyof T]: T[K] | Error };
  errorIndexes: number[];
}>;

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
  const { concurrency = 5, stopOnError = true, throwOriginalError = false } = options;
  const results: any[] = new Array(tasks.length);
  const errorIndexes: number[] = [];
  let nextIndex = 0;
  let caughtError: unknown = undefined;

  const worker = async () => {
    while (nextIndex < tasks.length) {
      if (stopOnError && caughtError !== undefined) return;

      const index = nextIndex++;
      const task = tasks[index];

      try {
        results[index] = await task();
      } catch (error) {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error(String(error ?? "Unknown error"));

        if (stopOnError) {
          caughtError = throwOriginalError
            ? normalizedError
            : new ConcurrencyError(normalizedError, index);
          return;
        }

        results[index] = throwOriginalError
          ? normalizedError
          : new ConcurrencyError(normalizedError, index);
        errorIndexes.push(index);
      }
    }
  };

  await Promise.allSettled(Array.from({ length: concurrency }, () => worker()));

  if (caughtError !== undefined) {
    throw caughtError;
  }

  if (stopOnError) {
    return results as { [K in keyof T]: T[K] };
  }

  return { data: results as any, errorIndexes: errorIndexes.sort((a, b) => a - b) };
}
