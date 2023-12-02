import esbuild from "https://raw.githubusercontent.com/maemon4095/tauri-deno-builder/main/src/deps/esbuild.ts";
import * as path from "https://deno.land/std@0.207.0/path/mod.ts";

export type ImportMap = { [prefix: string]: string; };
export default function SVGPlugin(options?: { importMap?: string | ImportMap; }): esbuild.Plugin {
    const opts = options ?? {};
    let importMap: ImportMap = {};
    let importMapPrefix = "";
    if (typeof opts.importMap === "string") {
        const raw = Deno.readFileSync(opts.importMap);
        const text = new TextDecoder().decode(raw);
        const map = JSON.parse(text) as { imports: ImportMap; };

        importMapPrefix = path.dirname(opts.importMap);
        importMap = { ...importMap, ...(map.imports) };
    }

    if (typeof opts.importMap === "object") {
        importMap = { ...importMap, ...opts.importMap };
    }

    return {
        name: SVGPlugin.name,
        setup(build) {
            build.onResolve({ filter: /.*\.svg$/ }, args => {
                let prefix;
                let rest;

                for (const [pref, p] of Object.entries(importMap)) {
                    if (!args.path.startsWith(pref)) continue;

                    prefix = path.join(importMapPrefix, p);
                    rest = args.path.slice(pref.length);
                }

                if (prefix === undefined || rest === undefined) {
                    if (args.importer) {
                        prefix = path.dirname(args.importer);
                        rest = args.path;
                    } else {
                        prefix = args.resolveDir;
                        rest = args.path;
                    }
                }

                return {
                    path: path.join(prefix, rest),
                    namespace: SVGPlugin.name,
                };
            });
            build.onLoad({ filter: /.*/, namespace: SVGPlugin.name }, async args => {
                let svgtext;
                try {
                    const url = new URL(args.path);
                    const response = await fetch(url);
                    svgtext = await response.text();
                } catch {
                    const raw = await Deno.readFile(args.path);
                    svgtext = new TextDecoder().decode(raw);
                }

                const pattern = /<(?<tag>[sS][vV][gG])(?<rest>.*)/sg;
                const match = pattern.exec(svgtext);

                if (match === null) {
                    return undefined;
                }

                const { tag, rest } = match.groups!;

                const contents = `
                    import React from "https://esm.sh/react@18.2.0";
                    export default (props) => {
                        return (<${tag} {...props} ${rest})
                    };
                    `;

                return { contents, loader: "jsx" };
            });
        }
    };
}