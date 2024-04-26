import { posixPath } from "./deps/std.ts";
import { BuilderOptions, InternalBuilderOptions } from "./options.ts";

export function preprocessOptions(rawOptions: BuilderOptions): InternalBuilderOptions {
    const options = {} as InternalBuilderOptions;
    options.esbuildPlugins = rawOptions.esbuildPlugins ?? [];
    options.esbuildPluginsLater = rawOptions.esbuildPluginsLater ?? [];
    options.outdir = posixPath.normalize(rawOptions.outdir ?? "./dist");
    options.outbase = posixPath.normalize(rawOptions.outbase ?? "./");
    options.serve = (() => {
        const port = rawOptions.serve?.port ?? 1415;
        const watch = rawOptions.serve?.watch ?? ["./src"];
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
        const entryPoints = rawOptions.entryPoints;
        if (!Array.isArray(entryPoints) || entryPoints.length < 1) {
            throw new Error("entryPoints must be array with at least one element.");
        }
        (options as any)["entryPoints"] = entryPoints.map(posixPath.normalize);
    } else if ("documentFilePath" in rawOptions) {
        const documentFilePath = rawOptions.documentFilePath;
        if (typeof documentFilePath !== "string") {
            throw new Error("documentFilePath must be string.");
        }
        (options as any)["documentFilePath"] = posixPath.relative("./", documentFilePath);
    } else {
        throw new Error("options must have entryPoints or documentFilePath property.");
    }

    return options;
}
