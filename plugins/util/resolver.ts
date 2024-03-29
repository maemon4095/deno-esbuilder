import { esbuild, posixPath } from "./deps.ts";

export type ImportMap = { [prefix: string]: string; };
export function createResolverFromImportMap(importMapOrPath: string | ImportMap) {
    let importMap: ImportMap = {};
    let importMapPrefix = "";
    if (typeof importMapOrPath === "string") {
        const raw = Deno.readFileSync(importMapOrPath);
        const text = new TextDecoder().decode(raw);
        const map = JSON.parse(text) as { imports: ImportMap; };

        importMapPrefix = posixPath.dirname(importMapOrPath);
        importMap = { ...importMap, ...(map.imports) };
    }

    if (typeof importMapOrPath === "object") {
        importMap = { ...importMap, ...importMapOrPath };
    }

    return (p: string) => {
        for (const [pref, rep] of Object.entries(importMap)) {
            if (!p.startsWith(pref)) continue;

            return posixPath.join(importMapPrefix, rep, p.slice(pref.length));
        }
    };
}

export function defaultResolve(args: esbuild.OnResolveArgs) {
    if (args.importer) {
        return posixPath.join(posixPath.dirname(args.importer), args.path);
    } else {
        return posixPath.join(args.resolveDir, args.path);
    }

}