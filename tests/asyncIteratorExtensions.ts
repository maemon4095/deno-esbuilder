import { merge } from "../src/asyncIteratorExtensions.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("merge without args", async () => {
    const iter = merge()[Symbol.asyncIterator]();
    const result = await iter.next();

    assertEquals(result, { done: true, value: undefined });
});

Deno.test("merge with sequential args", async () => {
    const size = 10;
    const delay = 100;
    const iters: AsyncIterable<number>[] = [];
    for (let i = 1; i <= size; ++i) {
        const v = i;
        const iter = async function* () {
            await new Promise(r => setTimeout(r, v * delay));
            yield v;
        };

        iters.push(iter());
    }

    const iter = merge(...iters);

    let count = 0;
    for await (const item of iter) {
        assertEquals(item, count + 1);

        count++;
    }
    assertEquals(count, size);
});