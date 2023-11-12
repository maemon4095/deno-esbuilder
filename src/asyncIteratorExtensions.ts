export function merge<T>(...iters: AsyncIterable<T>[]): AsyncIterable<T> {
    const iter = mergeIter(...iters.map(i => i[Symbol.asyncIterator]()));

    return {
        [Symbol.asyncIterator]() {
            return iter;
        },
    };
}


function eventy<T>(iter: AsyncIterator<T>, callback: (v: T) => void, endCallback: () => void) {
    new Promise(async r => {
        while (true) {
            const { done, value } = await iter.next();
            if (done) {
                break;
            }
            callback(value);
        }

        endCallback();
    });
}


export function mergeIter<T>(...iters: AsyncIterator<T>[]): AsyncIterator<T> {
    const iterators = Array.from(iters);
    const channel = new AsyncChannel<T>();

    let count = iterators.length;
    for (const iter of iterators) {
        eventy(iter, v => { channel.send(v); }, () => {
            count--;
            if (count === 0) {
                channel.close();
            }
        });
    }

    return {
        next: async function (): Promise<IteratorResult<T, any>> {
            const value = await channel.receive();
            if (value === null) {
                return { done: true, value: undefined };
            }
            return { done: false, value };
        }
    };
}

export class AsyncChannel<T> {
    #items: Queue<T>;
    #waitings: Queue<(v: T | null) => void>;
    #isClosed;
    constructor() {
        this.#items = new Queue();
        this.#waitings = new Queue();
        this.#isClosed = false;
    }

    get isEmpty() {
        return this.#items.isEmpty;
    }

    send(value: T) {
        if (this.#waitings.isEmpty) {
            this.#items.enqueue(value);
            return;
        }
        const callback = this.#waitings.dequeue()!;
        callback(value);
    }

    close() {
        this.#isClosed = true;
        while (true) {
            const callback = this.#waitings.dequeue();
            if (callback === null) {
                break;
            }
            callback(null);
        }
    }

    async receive(): Promise<T | null> {
        if (this.#isClosed) {
            return null;
        }

        if (!this.#items.isEmpty) {
            return this.#items.dequeue()!;
        }
        return await new Promise(e => this.#waitings.enqueue(e));
    }
}


export class Queue<T> {
    #head: null | Node<T>;
    constructor() {
        this.#head = null;
    }

    get isEmpty() {
        return this.#head === null;
    }

    enqueue(value: T) {
        const node = { value, next: this.#head };
        this.#head = node;
    }

    dequeue(): T | null {
        const head = this.#head;
        if (head === null) {
            return null;
        }

        const value = head.value;
        const next = head.next;
        this.#head = next;

        return value;
    }
}

type Node<T> = { value: T; next: null | Node<T>; };