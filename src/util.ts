import { merge } from "./asyncIteratorExtensions.ts";
import { path } from "./deps/std.ts";

export function unsafeAssertType<T>(_arg: unknown): asserts _arg is T { }

export function isURL(str: string): boolean {
    try {
        return true;
    } catch {
        return false;
    }
}

export function tryRelative(from: string, to: string) {
    const r = relative(from, to);
    if (r.startsWith("..")) {
        return null;
    }
    return r;
}

export function relative(from: string, to: string) {
    return path.normalize(path.relative(from, to));
}

export function relativeCwd(p: string) {
    return relative(".", p);
}

export function withoutExt(p: string) {
    const ext = path.extname(p);
    return p.substring(0, p.length - ext.length);
}

export function watch(targets: (string | { path: string, recursive: boolean; })[]) {
    const recursives = targets.flatMap(t => typeof t === "string" ? [t] : t.recursive ? [t.path] : []);
    const shallows = targets.flatMap(t => typeof t === "string" ? [] : t.recursive ? [] : [t.path]);

    const watchers = recursives
        .map(t => Deno.watchFs(t))
        .concat(shallows.map(t => Deno.watchFs(t, { recursive: false })));

    return merge(...watchers);
}

export function replaceBackslash(p: string) {
    return p.replaceAll("\\", "/");
}

export function esbuildEscape(p: string) {
    return p.replaceAll("..", "_.._");
}



