import { Builder } from "../../src/builder.ts";
import { BuilderOptions } from "../../src/options.ts";

const options: BuilderOptions = {
    profileName: "dev",
    denoConfigPath: "./deno.json"
};

const builder = new Builder(options);

await builder.serve();