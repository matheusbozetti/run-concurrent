export default class ConcurrencyError extends Error {
    readonly originalError: Error;
    readonly index: number;
    constructor(originalError: Error, index: number);
}
