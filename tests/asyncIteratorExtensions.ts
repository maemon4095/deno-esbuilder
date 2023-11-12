import { mergeIter } from "../src/asyncIteratorExtensions.ts";
import { assertEquals } from "https://deno.land/std@0.206.0/assert/mod.ts";

Deno.test("mergeIter without args", async () => {
    const iter = mergeIter();
    const result = await iter.next();

    assertEquals(result, { done: true, value: undefined });
});

Deno.test("mergeIter with sequential args", async () => {
    const size = 10;
    const delay = 100;
    const iters: AsyncIterator<number>[] = [];
    for (let i = 1; i <= size; ++i) {
        const v = i;
        const iter = async function* () {
            await new Promise(r => setTimeout(r, v * delay));
            yield v;
        };

        iters.push(iter());
    }

    const iter = mergeIter(...iters);

    let count = 0;
    while (true) {
        const result = await iter.next();
        if (result.done) {
            break;
        }

        assertEquals(result.value, count + 1);

        count++;
    }

    assertEquals(count, size);
});