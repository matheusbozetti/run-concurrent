# run-concurrent

Lightweight TypeScript utility to run async functions concurrently with a **concurrency limit**. A smarter alternative to `Promise.all` for **batch processing**, **rate limiting**, and **parallel task execution** in Node.js.

**Zero dependencies** | **Full TypeScript support** | **ESM & CJS**

## Why not just `Promise.all`?

`Promise.all` fires every promise at once. With hundreds of tasks (API calls, DB queries, file operations), that means resource exhaustion, rate limit errors, and unpredictable behavior.

`runConcurrent` gives you:

- **Concurrency control** — limit how many operations run at the same time
- **Sync & async tasks** — works with both regular functions and async functions
- **Graceful error handling** — continue execution even when some tasks fail (`stopOnError: false`)
- **Fail-fast mode** — stop immediately on the first error (`stopOnError: true`)
- **Original error propagation** — optionally rethrow the original error instead of wrapping it (`throwOriginalError: true`)
- **Ordered results** — results come back in declaration order, not execution order
- **Strong type inference** — preserves tuple types for heterogeneous task arrays

## Installation

```sh
npm install @matheusbozetti/run-concurrent
# or
pnpm add @matheusbozetti/run-concurrent
# or
yarn add @matheusbozetti/run-concurrent
```

## Quick Start

```ts
import { runConcurrent } from "@matheusbozetti/run-concurrent";

const results = await runConcurrent(
  [
    async () => fetch("/api/users").then((r) => r.json()),
    async () => fetch("/api/posts").then((r) => r.json()),
    async () => fetch("/api/comments").then((r) => r.json()),
  ],
  { concurrency: 2 }
);
// results: [users, posts, comments] — in order, 2 at a time
```

## API

### `runConcurrent(tasks, options?)`

Executes an array of async functions with controlled concurrency.

#### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `tasks` | `Array<() => T \| Promise<T>>` | Array of sync or async functions to execute |
| `options` | `RunConcurrentOptions` | Configuration (see below) |

#### Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `concurrency` | `number` | `5` | Maximum number of tasks running in parallel |
| `stopOnError` | `boolean` | `true` | If `true`, stops on first failure and throws. If `false`, continues and collects errors |
| `throwOriginalError` | `boolean` | `false` | If `true`, throws/stores the original `Error` instead of wrapping it in `ConcurrencyError` |

#### Return Types

**When `stopOnError: true`** (default) — returns `Promise<T[]>`

```ts
const results = await runConcurrent(tasks, { stopOnError: true });
// T[] — array of resolved values
```

**When `stopOnError: false`** — returns `Promise<{ data, errorIndexes }>`

```ts
const results = await runConcurrent(tasks, { stopOnError: false });
// { data: (T | ConcurrencyError)[], errorIndexes: number[] }
```

**When `stopOnError: false` + `throwOriginalError: true`** — errors are the original `Error` instead of `ConcurrencyError`

```ts
const results = await runConcurrent(tasks, {
  stopOnError: false,
  throwOriginalError: true,
});
// { data: (T | Error)[], errorIndexes: number[] }
```

## Error Handling

### Default: `ConcurrencyError` wrapper

When a task fails, it is wrapped in a `ConcurrencyError` that includes:

- `message` — the original error message
- `index` — position of the failed task in the input array
- `originalError` — reference to the original `Error` object

```ts
const results = await runConcurrent(
  [
    async () => "ok",
    async () => { throw new Error("timeout"); },
    async () => "ok",
  ],
  { stopOnError: false }
);

console.log(results.data);
// ["ok", ConcurrencyError { message: "timeout", index: 1 }, "ok"]
console.log(results.errorIndexes);
// [1]
```

### Propagating the original error

Use `throwOriginalError: true` when you need to check `instanceof` or preserve custom error types:

```ts
class ApiError extends Error {
  constructor(public statusCode: number) {
    super(`HTTP ${statusCode}`);
  }
}

// With stopOnError: true — throws the original ApiError
try {
  await runConcurrent(
    [async () => { throw new ApiError(429); }],
    { stopOnError: true, throwOriginalError: true }
  );
} catch (error) {
  console.log(error instanceof ApiError); // true
  console.log(error.statusCode); // 429
}

// With stopOnError: false — stores the original error in the data array
const results = await runConcurrent(
  [async () => { throw new ApiError(429); }],
  { stopOnError: false, throwOriginalError: true }
);
console.log(results.data[0] instanceof ApiError); // true
```

## Sync Functions

Sync functions work the same way as async ones — no changes needed:

```ts
const results = await runConcurrent(
  [
    () => expensiveComputation(1),
    () => expensiveComputation(2),
    async () => await fetchData(3),   // mix freely
  ],
  { concurrency: 2 }
);
```

## TypeScript Type Inference

`runConcurrent` preserves individual return types when tasks are inlined or declared with `as const`:

```ts
// Inlined — TypeScript infers [number, string, boolean]
const results = await runConcurrent([
  () => 42,
  () => "hello",
  async () => true,
]);

// With `as const` — same inference
const tasks = [
  () => 42,
  () => "hello",
  async () => true,
] as const;
const results = await runConcurrent(tasks);
// [number, string, boolean]
```

Without `as const`, TypeScript widens the type to `(string | number | boolean)[]`.

## Use Cases

- **API batch requests** — call multiple endpoints without overwhelming the server
- **Database bulk operations** — insert/update rows with connection pool limits
- **File processing** — read/write many files without exhausting file descriptors
- **Web scraping** — crawl pages with controlled request rate
- **Microservice orchestration** — fan-out requests to downstream services

## Testing

```sh
pnpm test  # or npm test / yarn test
```

Tests are written with [Vitest](https://vitest.dev/).

## License

MIT License © Matheus
