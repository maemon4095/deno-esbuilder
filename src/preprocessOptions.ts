import { path } from "./deps/std.ts";
import { BuilderOptions, InternalBuilderOptions, InternalBuilderOptionsWithDocument, InternalBuilderOptionsWithEntryPoints } from "./options.ts";
import { unsafeAssertType, relativeCwd } from "./util.ts";
export function preprocessOptions(rawOptions: BuilderOptions): InternalBuilderOptions {
    const options = {} as Partial<InternalBuilderOptions>;
    options.esbuildPlugins = rawOptions.esbuildPlugins ?? [];
    options.esbuildPluginsLater = rawOptions.esbuildPluginsLater ?? [];
    options.outdir = relativeCwd(rawOptions.outdir ?? "./dist");
    options.outbase = relativeCwd(rawOptions.outbase ?? ".");
    options.serve = (() => {
        const port = rawOptions.serve?.port ?? 1415;
        const watch = (() => {
            const watch = rawOptions.serve?.watch ?? ["./src"];
            for (let i = 0; i < watch.length; ++i) {
                const p = watch[i];
                if (typeof p === "string") {
                    watch[i] = relativeCwd(p);
                } else {
                    p.path = relativeCwd(p.path);
                }
            }
            return watch;
        })();
        return { port, watch };
    })();
    options.esbuildOptions = rawOptions.esbuildOptions;
    options.treeShaking = rawOptions.treeShaking ?? true;
    options.sourcesContent = rawOptions.sourcesContent;
    options.sourceMap = rawOptions.sourceMap ?? true;
    options.sourceRoot = rawOptions.sourceRoot;
    options.dropLabels = rawOptions.dropLabels ?? [];
    options.minifySyntax = rawOptions.minifySyntax ?? true;
    options.minifyIdentifiers = rawOptions.minifyIdentifiers ?? true;
    options.minifyWhitespace = rawOptions.minifyWhitespace ?? true;
    options.denoConfigPath = rawOptions.denoConfigPath;
    options.importMapURL = rawOptions.importMapURL;
    options.nodeModulesDir = rawOptions.nodeModulesDir;
    options.denoPluginLoader = rawOptions.denoPluginLoader;
    options.loader = rawOptions.loader;
    options.clearDistDir = rawOptions.clearDistDir ?? false;

    if ("entryPoints" in rawOptions) {
        unsafeAssertType<InternalBuilderOptionsWithEntryPoints>(options);
        const entryPoints = rawOptions.entryPoints;
        if (!Array.isArray(entryPoints) || entryPoints.length < 1) {
            throw new Error("entryPoints must be array with at least one element.");
        }
        options.entryPoints = entryPoints.map(relativeCwd) as [string, ...string[]];
    } else if ("documentFilePath" in rawOptions) {
        unsafeAssertType<InternalBuilderOptionsWithDocument>(options);
        const documentFilePath = rawOptions.documentFilePath;
        if (typeof documentFilePath !== "string") {
            throw new Error("documentFilePath must be string.");
        }
        options.documentFilePath = relativeCwd(documentFilePath);
        options.documentFileDir = path.dirname(options.documentFilePath);
    } else {
        throw new Error("options must have entryPoints or documentFilePath property.");
    }

    return options;
}
