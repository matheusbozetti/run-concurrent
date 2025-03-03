export default class ConcurrencyError extends Error {
  constructor(
    message: string,
    readonly index: number,
    readonly originalStack?: string
  ) {
    super(message);
    if (originalStack) {
      this.stack = originalStack;
    }
  }
}
