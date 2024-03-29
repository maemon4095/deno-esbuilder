import { BuilderOptions, InternalBuilderOptions, ServeOptions } from "./options.ts";
import esbuild from "./deps/esbuild.ts";
import { fs } from "./deps/std.ts";
import { path } from "./deps/std.ts";
import { preprocessOptions } from "./preprocessOptions.ts";
import { safeRemove, watch } from "./util.ts";
import { createContext } from "./createContext.ts";

export const BUNDLE_TARGET_ATTRIBUTE = "data-esbuilder-bundle";
export const STATIC_RESOURCE_ATTRIBUTE = "data-esbuilder-static";

export class Builder {
    #options: InternalBuilderOptions;
    constructor(options: BuilderOptions) {
        this.#options = preprocessOptions(options);
    }

    async build() {
        const options = this.#options;
        const { context } = await createContext(options);

        console.log("Building...");
        await safeRemove(options.outdir);
        const result = await context.rebuild();
        console.log("Done build!");
        console.log(result);
        await context.dispose();
        esbuild.stop();
    }

    async serve(options: Partial<ServeOptions> = {}) {
        const builderOptions = this.#options;
        await safeRemove(builderOptions.outdir);
        if (options.port !== undefined) {
            builderOptions.serve.port = options.port;
        }
        if (options.watch !== undefined) {
            builderOptions.serve.watch = options.watch;
        }
        const { context, staticResources } = await createContext(builderOptions);
        const { host, port } = await context.serve({ port: builderOptions.serve.port, servedir: builderOptions.outdir, });
        const origin = host === "0.0.0.0" ? "localhost" : host;
        console.log(`Serving on http://${origin}:${port}`);
        const watcher = watch(builderOptions.serve.watch);
        console.log("Watching...");

        const getStaticResourceRelativePath = (() => {
            if (staticResources === undefined) {
                return (_: string) => undefined;
            }

            return (p: string) => {
                for (const [rpath, dst] of staticResources) {
                    if (path.normalize(p) === path.resolve(rpath)) {
                        return dst;
                    }
                }
                return undefined;
            };
        })();

        const outdir = builderOptions.outdir;
        for await (const e of watcher) {
            console.log(`File Update: (${e.kind}) ${e.paths}.`);
            for (const p of e.paths) {
                const relative = getStaticResourceRelativePath(p);
                if (relative) {
                    await fs.copy(p, path.join(outdir, relative), { overwrite: true });
                }
            }
            try {
                await context.rebuild();
            } catch (e) {
                console.error(e);
            }
        }

        await context.dispose();
        esbuild.stop();
    }
}
