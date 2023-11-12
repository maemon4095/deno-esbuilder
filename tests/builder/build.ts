import { Builder } from "../../src/builder.ts";
import esbuild from "../../src/deps/esbuild.ts";
import { BuilderOptions } from "../../src/options.ts";
import postcss from "npm:postcss";
import tailwindcss from "npm:tailwindcss";

const mode = Deno.args.at(0);
if (mode === undefined) {
    throw new Error("no mode was provided");
}

const options: BuilderOptions = {
    denoConfigPath: "./deno.json",
    bundleTargets: [/.*\.(jsx|tsx|js|ts|css)/],
    esbuildPlugins: [
        postCssPlugin([
            tailwindcss({
                content: {
                    files: ["./src/**/*.{tsx, ts}"]
                },
            })
        ])
    ]
};

const builder = new Builder(options);

switch (mode) {
    case "serve": {
        await builder.serve();
        break;
    }
    case "build": {
        await builder.build();
        break;
    }
}


function postCssPlugin(plugins: postcss.AcceptedPlugin[]): esbuild.Plugin {
    const name = "postCssPlugin";

    return {
        name,
        setup(build) {
            build.onResolve({ filter: /.*\.css/ }, args => ({
                path: args.path,
                namespace: name,
            }));

            build.onLoad({ filter: /.*/, namespace: name }, async args => {
                const cssdata = await Deno.readFile(args.path);
                const cssfile = new TextDecoder().decode(cssdata);

                const result = await postcss(plugins).process(cssfile, { from: args.path });

                return { contents: result.css, loader: "css" };
            });
        }
    };
}