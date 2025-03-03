'use strict';

class ConcurrencyError extends Error {
    constructor(message, index, originalStack) {
        super(message);
        this.index = index;
        this.originalStack = originalStack;
        if (originalStack) {
            this.stack = originalStack;
        }
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
        const { concurrency = 1, stopOnError = true } = options;
        const results = new Array(tasks.length);
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
                    if (!(error instanceof Error)) {
                        throw new ConcurrencyError(String(error), index);
                    }
                    if (stopOnError) {
                        errorOccurred = true;
                        throw new ConcurrencyError(error.message, index, error.stack);
                    }
                    results[index] = new ConcurrencyError(error.message, index, error.stack);
                }
            }
        });
        yield Promise.all(Array.from({ length: concurrency }, () => worker()));
        return results;
    });
}

exports.ConcurrencyError = ConcurrencyError;
exports.runConcurrent = runConcurrent;
//# sourceMappingURL=index.cjs.map
