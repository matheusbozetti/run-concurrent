import { describe, it, expect } from "vitest";
import { runConcurrent } from "./runConcurrent.js";
import ConcurrencyError from "./errors/ConcurrencyError.js";

describe("runConcurrent", () => {
  it("should execute all tasks sequentially when concurrency is 1", async () => {
    const order: number[] = [];
    const tasks = [
      async () => {
        order.push(1);
        return "Task 1";
      },
      async () => {
        order.push(2);
        return "Task 2";
      },
      async () => {
        order.push(3);
        return "Task 3";
      },
    ];

    const results = await runConcurrent(tasks, { concurrency: 1 });

    expect(results).toEqual(["Task 1", "Task 2", "Task 3"]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("should execute tasks concurrently when concurrency > 1", async () => {
    const started: number[] = [];
    const tasks = [
      async () => {
        started.push(1);
        await new Promise((r) => setTimeout(r, 50));
        return "Task 1";
      },
      async () => {
        started.push(2);
        await new Promise((r) => setTimeout(r, 50));
        return "Task 2";
      },
    ];

    const results = await runConcurrent(tasks, { concurrency: 2 });

    expect(results).toEqual(["Task 1", "Task 2"]);
    expect(started).toContain(1);
    expect(started).toContain(2);
  });

  it("should execute tasks concurrently and return results in the order they were declared and not executed", async () => {
    const started: number[] = [];
    const tasks = [
      async () => {
        started.push(1);
        await new Promise((r) => setTimeout(r, 200));
        return "Task 1";
      },
      async () => {
        started.push(2);
        await new Promise((r) => setTimeout(r, 50));
        return "Task 2";
      },
      async () => {
        started.push(3);
        await new Promise((r) => setTimeout(r, 10));
        return "Task 3";
      },
    ];

    const results = await runConcurrent(tasks, { concurrency: 2 });

    expect(results).toEqual(["Task 1", "Task 2", "Task 3"]);
    expect(started).toContain(1);
    expect(started).toContain(2);
    expect(started).toContain(3);
  });

  it("should return ConcurrencyError when stopOnError is false", async () => {
    const tasks = [
      async () => "Task 1",
      async () => {
        throw new Error("Failure");
      },
      async () => "Task 3",
    ];

    const results = await runConcurrent(tasks, {
      concurrency: 2,
      stopOnError: false,
    });

    expect(results[0]).toBe("Task 1");
    expect(results[2]).toBe("Task 3");
    expect(results[1]).toBeInstanceOf(ConcurrencyError);
    expect((results[1] as ConcurrencyError).message).toBe("Failure");
  });

  it("should stop execution on first error when stopOnError is true", async () => {
    const tasks = [
      async () => "Task 1",
      async () => {
        throw new Error("Failure");
      },
      async () => "Task 3",
    ];

    await expect(
      runConcurrent(tasks, { concurrency: 2, stopOnError: true })
    ).rejects.toThrow(ConcurrencyError);
  });

  it("should handle empty task list gracefully", async () => {
    const results = await runConcurrent([], { concurrency: 3 });
    expect(results).toEqual([]);
  });

  it("should throw ConcurrencyError if non-Error is thrown", async () => {
    const tasks = [
      async () => {
        throw "String error";
      },
    ];

    await expect(
      runConcurrent(tasks, { concurrency: 1, stopOnError: true })
    ).rejects.toThrow(ConcurrencyError);
  });

  it("should correctly assign errors to their respective indexes", async () => {
    const tasks = [
      async () => "Task 1",
      async () => {
        throw new Error("Error at task 2");
      },
      async () => {
        throw new Error("Error at task 3");
      },
    ];

    const results = await runConcurrent(tasks, {
      concurrency: 3,
      stopOnError: false,
    });

    expect(results[0]).toBe("Task 1");
    expect(results[1]).toBeInstanceOf(ConcurrencyError);
    expect(results[2]).toBeInstanceOf(ConcurrencyError);
    expect((results[1] as ConcurrencyError).index).toBe(1);
    expect((results[2] as ConcurrencyError).index).toBe(2);
  });
});
