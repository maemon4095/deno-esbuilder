import { BuilderOptions, CompleteBuilderCommonOptions, CompleteBuilderOptions, CompleteBuilderOptionsWithDocument, CompleteServeOptions, ServeOptions } from "./options.ts";
import { denoPlugins } from "./deps/esbuild_deno_loader.ts";
import { coalesce } from "./deps/coalesce.ts";
import esbuild from "./deps/esbuild.ts";
import { HTMLElement, parse as parseDOM } from "npm:node-html-parser";
import { fs, path } from "./deps/std.ts";
import { merge } from "./asyncIteratorExtensions.ts";

const defaultOptions: CompleteBuilderCommonOptions = {
    outdir: "./dist",
    outbase: "src",
    esbuildPlugins: [],
    esbuildPluginsLater: [],
    serve: {
        port: 1415,
        watch: ["src"]
    },
    esbuildOptions: undefined,
    staticResources: [],
    dropLabels: [],
    minifySyntax: false,
    minifyIdentifiers: false,
    minifyWhitespace: false,
    bundleTargets: [/.*\.(jsx|tsx|js|ts)$/],
    treeShaking: false,
    sourceMap: true,
    sourcesContent: true,
};

export class Builder {
    #options: CompleteBuilderOptions;
    constructor(options: BuilderOptions) {
        const t = coalesce(options, defaultOptions);
        this.#options = t as any;
    }

    async build() {
        const options = this.#options;
        const context = await preprocess(options);

        console.log("Building...");
        const result = await context.rebuild();
        console.log("Done build!");
        console.log(result);
        await context.dispose();
        esbuild.stop();
    }

    async serve(options: Partial<ServeOptions> = {}) {
        const builderOptions = this.#options;

        if (options.port !== undefined) {
            builderOptions.serve.port = options.port;
        }
        if (options.watch !== undefined) {
            builderOptions.serve.watch = options.watch;
        }

        const context = await preprocess(builderOptions);

        const { host, port } = await context.serve({ port: builderOptions.serve.port, servedir: builderOptions.outdir, });

        const origin = host === "0.0.0.0" ? "localhost" : host;

        console.log(`Serving on http://${origin}:${port}`);

        const watcher = watch(builderOptions.serve.watch);
        console.log("Watching...");

        const isStaticResource = (p: string) => {
            const normalized = path.normalize(p);
            for (const r of builderOptions.staticResources) {
                if (normalized === path.normalize(r)) {
                    return true;
                }
            }
            return false;
        };

        for await (const e of watcher) {
            console.log(`File Update: (${e.kind}) ${e.paths}.`);
            for (const path of e.paths) {
                if (isStaticResource(path)) {
                    await fs.copy(path, builderOptions.outdir, { overwrite: true });
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


export function watch(targets: (string | { path: string, recursive: boolean; })[]) {
    const recursives = targets.flatMap(t => typeof t === "string" ? [t] : t.recursive ? [t.path] : []);
    const shallows = targets.flatMap(t => typeof t === "string" ? [] : t.recursive ? [] : [t.path]);

    const watchers = recursives
        .map(t => Deno.watchFs(t))
        .concat(shallows.map(t => Deno.watchFs(t, { recursive: false })));

    return merge(...watchers);
}

export async function preprocess(options: CompleteBuilderOptions) {
    if (!(await fs.exists(options.outdir))) {
        await Deno.mkdir(options.outdir);
    }

    let entryPoints;

    if ("entryPoints" in options) {
        entryPoints = options.entryPoints;
    } else {
        const indexFile = await Deno.readTextFile(options.documentFilePath);
        const documentRoot = parseDOM(indexFile);

        entryPoints = preprocessDocument(options, documentRoot);

        const outIndexFilePath = path.join(options.outdir, path.basename(options.documentFilePath));
        const outIndexFile = await Deno.create(outIndexFilePath);
        await outIndexFile.write(new TextEncoder().encode(documentRoot.toString()));
    }

    for (const r of options.staticResources) {
        await fs.copy(r, options.outdir, { overwrite: true });
    }

    const esbuildOptions: esbuild.BuildOptions = {
        plugins: [
            ...options.esbuildPlugins,
            ...denoPlugins({
                configPath: options.denoConfigPath !== undefined ? path.resolve(options.denoConfigPath) : undefined,
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


    return await esbuild.context(esbuildOptions);
}


function preprocessDocument(options: CompleteBuilderOptionsWithDocument, documentRoot: HTMLElement): string[] {
    const entryPoints: string[] = [];

    const scriptElems = documentRoot.querySelectorAll(`script[type="module"][src]`);
    for (const e of scriptElems) {
        const rawsource = e.getAttribute("src")!;
        if (!matchTargetFilter(options.bundleTargets, rawsource)) {
            continue;
        }

        const source = path.normalize(rawsource);
        const ext = path.extname(path.normalize(source));
        const base = path.common([path.normalize(options.outbase), source]);
        const src = source.substring(base.length, source.length - ext.length);

        e.setAttribute("src", `${src}.js`);

        entryPoints.push(source);
    }

    const linkElems = documentRoot.querySelectorAll(`link[href]`);
    for (const e of linkElems) {
        const rawhref = e.getAttribute("href")!;
        if (!matchTargetFilter(options.bundleTargets, rawhref)) {
            continue;
        }
        const href = path.normalize(rawhref);
        const base = path.common([path.normalize(options.outbase), href]);
        const src = href.substring(base.length);
        e.setAttribute("href", src);

        entryPoints.push(rawhref);
    }


    return entryPoints;
}

function matchTargetFilter(filter: (string | RegExp)[], target: string): boolean {
    const index = filter.findIndex(pat => {
        if (pat instanceof RegExp) {
            return target.match(pat);
        } else {
            return target === pat;
        }
    });

    return index !== -1;
}
