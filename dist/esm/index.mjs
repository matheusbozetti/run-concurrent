class ConcurrencyError extends Error {
    constructor(originalError, index) {
        var _a;
        super((_a = originalError.message) !== null && _a !== void 0 ? _a : "Unknown error");
        this.originalError = originalError;
        this.index = index;
        this.stack = originalError.stack;
    }
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function runConcurrent(tasks_1) {
    return __awaiter(this, arguments, void 0, function* (tasks, options = {}) {
        const { concurrency = 5, stopOnError = true } = options;
        const results = new Array(tasks.length);
        const errorIndexes = [];
        let errorOccurred = false;
        const queue = tasks.map((task, index) => ({ task, index }));
        const worker = () => __awaiter(this, void 0, void 0, function* () {
            while (queue.length > 0 && (!stopOnError || !errorOccurred)) {
                const item = queue.shift();
                if (!item)
                    return;
                const { task, index } = item;
                try {
                    results[index] = yield task();
                }
                catch (error) {
                    const normalizedError = error instanceof Error
                        ? error
                        : new Error(String(error !== null && error !== void 0 ? error : "Unknown error"));
                    if (stopOnError) {
                        errorOccurred = true;
                        throw new ConcurrencyError(normalizedError, index);
                    }
                    results[index] = new ConcurrencyError(normalizedError, index);
                    errorIndexes.push(index);
                }
            }
        });
        yield Promise.all(Array.from({ length: concurrency }, () => worker()));
        if (stopOnError) {
            return results;
        }
        return { data: results, errorIndexes: errorIndexes.sort() };
    });
}

export { ConcurrencyError, runConcurrent };
//# sourceMappingURL=index.mjs.map
