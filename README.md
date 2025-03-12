# runConcurrent

`runConcurrent` is a utility function that allows you to execute multiple asynchronous tasks concurrently, with control over the concurrency level and error handling. It provides an alternative to `Promise.all` that is more efficient for large numbers of tasks and ensures a predictable execution flow.

## 🚀 Why use `runConcurrent` instead of `Promise.all`?

While `Promise.all` runs all promises in parallel with **no limit**, `runConcurrent` allows you to:

✅ Control concurrency level (`concurrency` option).  
✅ Handle errors gracefully without stopping execution (`stopOnError: false`).  
✅ Stop execution on the first failure (`stopOnError: true`).  
✅ Maintain an efficient event loop by preventing task overload.  
✅ Get the results in the order the promises were declared and not executed (Just like `Promise.all`).  

## 📦 Installation

```sh
pnpm add @matheusbozetti/run-concurrent
# or
npm install @matheusbozetti/run-concurrent
# or
yarn add @matheusbozetti/run-concurrent
```

## ✨ Usage

```ts
import { runConcurrent } from "@matheusbozetti/run-concurrent";

const tasks = [
  async () => "Task 1",
  async () => "Task 2",
  async () => "Task 3",
];

// Run tasks with concurrency = 2, stopping on first error
const results = await runConcurrent(tasks, {
  concurrency: 2,
  stopOnError: true,
});
console.log(results); // [ 'Task 1', 'Task 2', 'Task 3' ]
```

## ⚙️ Options

### `concurrency`

- Type: `number`
- Default: `5`
- Controls how many tasks run simultaneously.

### `stopOnError`

- Type: `boolean`
- Default: `true`
- If `true`, stops execution immediately on the first error and returns an array of successful results.
- If `false`, continues executing remaining tasks and returns an **object** with both results and error indices.

## 🛠️ Error Handling

If `stopOnError: false`, errors are captured as instances of `ConcurrencyError` and returned along with their indexes:

```ts
const results = await runConcurrent(
  [
    async () => "Task 1",
    async () => {
      throw new Error("Failure");
    },
    async () => "Task 3",
  ],
  { stopOnError: false }
);

console.log(results);
// Output:
// {
//   data: [ 'Task 1', ConcurrencyError: 'Failure', 'Task 3' ],
//   errorIndexes: [1]
// }
```

### `ConcurrencyError` Type

When an error occurs, `ConcurrencyError` provides detailed information.
Each `ConcurrencyError` contains:
- `message`: A description of the error.
- `index`: The index of the failed task in the original array.
- `originalError`: The original error that caused the failure, in case you need to validate the instance type or this type of information.

## 📌 Return Type Behavior

Depending on the value of `stopOnError`, the return type differs:

### ✅ When `stopOnError: true` (Default)
```ts
const results = await runConcurrent(tasks, { stopOnError: true });
// Returns an array of successful results: [T, T, T]
```

### ✅ When `stopOnError: false`
```ts
const results = await runConcurrent(tasks, { stopOnError: false });
// Returns an object:
// {
//   data: [T | ConcurrencyError, T | ConcurrencyError, T | ConcurrencyError],
//   errorIndexes: number[]
// }
```

## 🧪 Unit Tests

This package includes comprehensive tests using [Vitest](https://vitest.dev/). To run them:

```sh
pnpm test  # or npm test / yarn test
```

## Type Inference Considerations

### Ensuring Correct Type Inference

To ensure correct type inference when using `runConcurrent`, you should either inline the task array or explicitly type each promise:

#### ✅ Correct Type Inference:

```ts
const results = await runConcurrent([
  async () => 42,
  async () => "hello",
  async () => true,
]);
// TypeScript infers: [number, string, boolean]
```

#### ❌ Incorrect Type Inference with Predefined Arrays:

```ts
const tasks = [async () => 42, async () => "hello", async () => true];
const results = await runConcurrent(tasks);
// TypeScript infers: (string | number | boolean)[] ❌ (loses tuple types)
```

#### ✅ Fix: Use `as const` for Tuple Inference:

```ts
const tasks = [async () => 42, async () => "hello", async () => true] as const;
const results = await runConcurrent(tasks);
// TypeScript infers: [number, string, boolean]
```

## 📌 Stability & Contributions

- `runConcurrent` is stable and changes are made only in case of bugs.

- Pull requests are welcome! If you find a bug or have an improvement suggestion, feel free to open an issue or submit a PR.

## 📜 License

MIT License © Matheus


