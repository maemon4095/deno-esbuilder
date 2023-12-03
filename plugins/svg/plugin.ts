import { esbuild } from "../util/deps.ts";
import { createResolverFromImportMap, defaultResolve, ImportMap } from "../util/resolver.ts";

export type { ImportMap };
export default function SVGPlugin(options?: { importMap?: string | ImportMap; }): esbuild.Plugin {
    const opts = options ?? {};
    const importMapResolver = createResolverFromImportMap(opts.importMap ?? {});

    return {
        name: SVGPlugin.name,
        setup(build) {
            build.onResolve({ filter: /.*\.svg$/ }, args => {
                return {
                    path: importMapResolver(args.path) ?? defaultResolve(args),
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