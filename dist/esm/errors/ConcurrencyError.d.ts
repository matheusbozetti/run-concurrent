export default class ConcurrencyError extends Error {
    readonly index: number;
    readonly originalStack?: string | undefined;
    constructor(message: string, index: number, originalStack?: string | undefined);
}
