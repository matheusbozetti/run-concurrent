export default class ConcurrencyError extends Error {
  constructor(readonly originalError: Error, readonly index: number) {
    super(originalError.message ?? "Unknown error");
    this.stack = originalError.stack;
  }
}
