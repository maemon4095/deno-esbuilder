export function merge<T>(...iters: AsyncIterable<T>[]): AsyncIterable<T> {
    const iter = mergeIter(...iters.map(i => i[Symbol.asyncIterator]()));

    return {
        [Symbol.asyncIterator]() {
            return iter;
        },
    };
}


export function mergeIter<T>(...iters: AsyncIterator<T>[]): AsyncIterator<T> {
    const iterators: (AsyncIterator<T> | null)[] = Array.from(iters);
    const buffer = new Queue<T>();

    return {
        next: async function (): Promise<IteratorResult<T, any>> {
            if (!buffer.isEmpty) {
                return { done: false, value: buffer.dequeue()! };
            }

            const waitings: Promise<void>[] = [];

            for (let i = 0; i < iterators.length; ++i) {
                const iter = iterators[i];
                if (iter === null) {
                    continue;
                }

                const p = iter.next().then(v => {
                    if (v.done) {
                        iterators[i] = null;
                    } else {
                        buffer.enqueue(v.value);
                    }
                });

                waitings.push(p);
            }

            if (waitings.length === 0) {
                return { done: true, value: undefined };
            }

            await Promise.any(waitings);

            return { done: false, value: buffer.dequeue()! };
        }
    };
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
        if (this.#head === null) {
            return null;
        }

        const value = this.#head.value;
        const next = this.#head.next;
        this.#head = next;

        return value;
    }
}

type Node<T> = { value: T; next: null | Node<T>; };