import esbuild from "./deps/esbuild.ts";
import { denoPlugins } from "./deps/esbuild_deno_loader.ts";
import { fs, path } from "./deps/std.ts";
import { InternalBuilderOptions } from "./options.ts";
import { preprocessDocument } from "./preprocessDocument.ts";
import { parse as parseDOM } from "npm:node-html-parser";
import LoaderOverride from "../plugins/loaderOverride/mod.ts";

export async function initialize(options: InternalBuilderOptions) {
    if (!(await fs.exists(options.outdir))) {
        await Deno.mkdir(options.outdir);
    }

    console.log(options);

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

        const outIndexFilePath = path.join(options.outdir, path.basename(options.documentFilePath));
        const outIndexFile = await Deno.create(outIndexFilePath);
        await outIndexFile.write(new TextEncoder().encode(documentRoot.toString()));
        for (const [absolutepath, rpath] of staticResources) {
            const dst = path.join(options.outdir, rpath);
            await Deno.mkdir(path.dirname(dst), { recursive: true });
            await fs.copy(absolutepath, dst, { overwrite: true });
        }
    }

    const loaderOverridePlugin: esbuild.Plugin[] = [];
    if (options.loader) {
        loaderOverridePlugin.push(
            LoaderOverride({
                importMap: options.importMapURL ?? options.denoConfigPath,
                loader: options.loader
            })
        );
    }
    const configPath = options.denoConfigPath && path.resolve(options.denoConfigPath);
    const denoConfig: undefined | {
        compilerOptions?: {
            jsx?: esbuild.BuildOptions["jsx"];
            jsxFactory?: esbuild.BuildOptions["jsxFactory"];
            jsxFragmentFactory?: esbuild.BuildOptions["jsxFragment"];
            jsxImportSource?: esbuild.BuildOptions["jsxImportSource"];
        };
    } = configPath && JSON.parse(await Deno.readTextFile(configPath));

    const esbuildOptions: esbuild.BuildOptions = {
        plugins: [
            ...options.esbuildPlugins,
            ...loaderOverridePlugin,
            ...denoPlugins({
                configPath,
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

        jsx: denoConfig?.compilerOptions?.jsx,
        jsxFactory: denoConfig?.compilerOptions?.jsxFactory,
        jsxFragment: denoConfig?.compilerOptions?.jsxFragmentFactory,
        jsxImportSource: denoConfig?.compilerOptions?.jsxImportSource,

        bundle: true,
        format: "esm",
        platform: "browser",
        ...options.esbuildOptions,
    };

    return { context: await esbuild.context(esbuildOptions), staticResources };
}