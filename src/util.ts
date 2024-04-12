import { merge } from "./asyncIteratorExtensions.ts";
import { fs, posixPath } from "./deps/std.ts";

export function isURL(str: string): boolean {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

export function tryRelative(from: string, to: string) {
    const r = posixPath.normalize(posixPath.relative(from, to));
    if (r.startsWith("..")) {
        return to;
    }
    return r;
}

export function watch(targets: (string | { path: string, recursive: boolean; })[]) {
    const recursives = targets.flatMap(t => typeof t === "string" ? [t] : t.recursive ? [t.path] : []);
    const shallows = targets.flatMap(t => typeof t === "string" ? [] : t.recursive ? [] : [t.path]);

    const watchers = recursives
        .map(t => Deno.watchFs(t))
        .concat(shallows.map(t => Deno.watchFs(t, { recursive: false })));

    return merge(...watchers);
}