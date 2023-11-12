import { Builder } from "../../src/builder.ts";
import { BuilderOptions } from "../../src/options.ts";

const mode = Deno.args.at(0);
if (mode === undefined) {
    throw new Error("no mode was provided");
}

const options: BuilderOptions = {
    denoConfigPath: "./deno.json"
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