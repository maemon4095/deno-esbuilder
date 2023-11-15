import esbuild from "https://deno.land/x/esbuild@v0.19.4/mod.js";
import postcss from "npm:postcss";
import { path } from "../src/deps/std.ts";

export function postCssPlugin(plugins: postcss.AcceptedPlugin[]): esbuild.Plugin {
    const name = "postCssPlugin";

    return {
        name,
        setup(build) {
            build.onResolve({ filter: /.*\.css/ }, args => {
                console.log("[postCssPlugin]", args);
                return {
                    path: path.join(args.resolveDir, args.path),
                    namespace: name,
                };
            });

            build.onLoad({ filter: /.*/, namespace: name }, async args => {
                const cssdata = await Deno.readFile(args.path);
                const cssfile = new TextDecoder().decode(cssdata);

                const result = await postcss(plugins).process(cssfile, { from: args.path });

                return { contents: result.css, loader: "css" };
            });
        }
    };
}