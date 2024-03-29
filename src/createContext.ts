import esbuild from "./deps/esbuild.ts";
import { denoPlugins } from "./deps/esbuild_deno_loader.ts";
import { fs, posixPath } from "./deps/std.ts";
import { InternalBuilderOptions } from "./options.ts";
import { preprocessDocument } from "./preprocessDocument.ts";
import { parse as parseDOM } from "npm:node-html-parser";

export async function createContext(options: InternalBuilderOptions) {
    if (!(await fs.exists(options.outdir))) {
        await Deno.mkdir(options.outdir);
    }

    let entryPoints;
    let staticResources;

    if ("entryPoints" in options) {
        entryPoints = options.entryPoints;
    } else {
        const indexFile = await Deno.readTextFile(options.documentFilePath);
        const documentRoot = parseDOM(indexFile);

        const pair = preprocessDocument(options, documentRoot);
        entryPoints = pair.entryPoints;
        staticResources = pair.staticResources;

        const outIndexFilePath = posixPath.join(options.outdir, posixPath.basename(options.documentFilePath));
        const outIndexFile = await Deno.create(outIndexFilePath);
        await outIndexFile.write(new TextEncoder().encode(documentRoot.toString()));
        for (const [absolutepath, rpath] of staticResources) {
            const dst = posixPath.join(options.outdir, rpath);
            await Deno.mkdir(posixPath.dirname(dst), { recursive: true });
            await fs.copy(absolutepath, dst, { overwrite: true });
        }
    }

    const esbuildOptions: esbuild.BuildOptions = {
        plugins: [
            ...options.esbuildPlugins,
            ...denoPlugins({
                configPath: options.denoConfigPath !== undefined ? posixPath.resolve(options.denoConfigPath) : undefined,
                importMapURL: options.importMapURL,
                nodeModulesDir: options.nodeModulesDir,
                loader: options.denoPluginLoader
            }),
            ...options.esbuildPluginsLater
        ],
        entryPoints,
        outdir: options.outdir,
        outbase: options.outbase,

        sourcesContent: options.sourcesContent,
        sourcemap: options.sourceMap,
        sourceRoot: options.sourceRoot,

        treeShaking: options.treeShaking,
        minifySyntax: options.minifySyntax,
        minifyIdentifiers: options.minifyIdentifiers,
        minifyWhitespace: options.minifyWhitespace,

        bundle: true,
        format: "esm",
        platform: "browser",
        ...options.esbuildOptions,
    };

    return { context: await esbuild.context(esbuildOptions), staticResources };
}