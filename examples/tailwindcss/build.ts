import { Builder } from "../../src/builder.ts";
import { BuilderOptions } from "../../src/options.ts";
import tailwindcss from "npm:tailwindcss";
import postCssPlugin from "../../plugins/postCssPlugin.ts";
import tailwindConfig from "./tailwind.config.js";
const mode = Deno.args.at(0);
if (mode === undefined) {
    throw new Error("no mode was provided");
}

const options: BuilderOptions = {
    documentFilePath: "./index.html",
    denoConfigPath: "./deno.json",
    outbase: "./src",
    serve: {
        watch: ["./src", "./public"]
    },
    loader: {
        ".svg": "file"
    },
    esbuildPlugins: [
        postCssPlugin({
            plugins: [
                tailwindcss(tailwindConfig)
            ]
        })
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

