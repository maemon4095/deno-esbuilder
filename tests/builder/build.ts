import { Builder } from "../../src/builder.ts";
import { BuilderOptions } from "../../src/options.ts";

const options: BuilderOptions = {
    denoConfigPath: "./deno.json"
};

const builder = new Builder(options);

await builder.serve();