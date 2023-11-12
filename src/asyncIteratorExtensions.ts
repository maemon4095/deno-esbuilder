export function merge<T extends {} | null>(...iters: AsyncIterable<T>[]): AsyncIterable<T> {
    const iterators = iters.map(i => i[Symbol.asyncIterator]());
    const channel = new AsyncChannel<T>();

    let count = iterators.length;
    for (const iter of iterators) {
        eventify(iter, v => { channel.send(v); }, () => {
            count--;
            if (count === 0) {
                channel.close();
            }
        });
    }

    if (iters.length === 0) {
        channel.close();
    }

    return channel;
}


function eventify<T>(iter: AsyncIterator<T>, callback: (v: T) => void, endCallback: () => void) {
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


export class AsyncChannel<T extends {} | null> implements AsyncIterable<T> {
    #items: Queue<T>;
    #waitings: Queue<(v: T | undefined) => void>;
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
        if (this.#isClosed) {
            throw new Error("send called on already closed channel.");
        }

        if (this.#waitings.isEmpty) {
            this.#items.enqueue(value);
            return;
        }
        const callback = this.#waitings.dequeue()!;
        callback(value);
    }

    close() {
        if (this.#isClosed) {
            return;
        }

        this.#isClosed = true;
        while (true) {
            const callback = this.#waitings.dequeue();
            if (callback === null) {
                break;
            }
            callback(undefined);
        }
    }

    async receive(): Promise<T | undefined> {
        if (this.#isClosed) {
            return undefined;
        }

        if (!this.#items.isEmpty) {
            return this.#items.dequeue()!;
        }
        return await new Promise(e => this.#waitings.enqueue(e));
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        const self = this;
        return {
            async next() {
                const value = await self.receive();
                if (value === undefined) {
                    return { done: true, value };
                }
                return { done: false, value };
            }
        };
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