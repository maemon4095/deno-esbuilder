import { BuilderOptions, CompleteBuilderOptions, ServeOptions } from "./options.ts";
import { denoPlugins } from "./deps/esbuild_deno_loader.ts";
import { coalesce } from "./deps/coalesce.ts";
import esbuild from "./deps/esbuild.ts";
import { HTMLElement, parse as parseDOM } from "npm:node-html-parser";
import { fs, path } from "./deps/std.ts";
import { merge } from "./asyncIteratorExtensions.ts";

const defaultOptions: CompleteBuilderOptions = {
    outdir: "./dist",
    outbase: "src",
    esbuildPlugins: [],
    documentFilePath: "./index.html",
    serve: {
        port: 1415,
        watch: ["src"]
    },
    esbuildOptions: undefined,
    staticResources: [],
    dropLabels: [],
    minifySyntax: false,
    bundleTargets: [/.*\.(jsx|tsx|js|ts)/]
};

export class Builder {
    #options: CompleteBuilderOptions;

    constructor(options: BuilderOptions) {
        this.#options = coalesce(options, defaultOptions);
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


        for await (const e of watcher) {
            console.log(`File Update: (${e.kind}) ${e.paths}.`);
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
    const indexFile = await Deno.readTextFile(options.documentFilePath);
    const documentRoot = parseDOM(indexFile);

    const entryPoints = preprocessDocument(options, documentRoot);

    if (!(await fs.exists(options.outdir))) {
        await Deno.mkdir(options.outdir);
    }

    for (const r of options.staticResources) {
        await fs.copy(r, options.outdir, { overwrite: true });
    }

    const outIndexFilePath = path.join(options.outdir, path.basename(options.documentFilePath));
    const outIndexFile = await Deno.create(outIndexFilePath);
    await outIndexFile.write(new TextEncoder().encode(documentRoot.toString()));

    const esbuildOptions: esbuild.BuildOptions = {
        plugins: [
            ...options.esbuildPlugins,
            ...denoPlugins({
                configPath: options.denoConfigPath !== undefined ? path.resolve(options.denoConfigPath) : undefined,
                importMapURL: options.importMapURL,
                nodeModulesDir: options.nodeModulesDir,
                loader: options.denoPluginLoader
            })
        ],
        entryPoints,
        outdir: options.outdir,
        outbase: options.outbase,
        bundle: true,
        format: "esm",
        platform: "browser",
        ...options.esbuildOptions,
    };


    return await esbuild.context(esbuildOptions);
}


function preprocessDocument(options: CompleteBuilderOptions, documentRoot: HTMLElement): string[] {
    const entryPoints: string[] = [];

    const scriptSources: string[] = [];
    const scriptElems = documentRoot.querySelectorAll(`script[type="module"][src]`);

    for (const e of scriptElems) {
        const source = e.getAttribute("src")!;
        if (!matchTargetFilter(options.bundleTargets, source)) {
            continue;
        }
        e.remove();
        entryPoints.push(source);
        scriptSources.push(path.normalize(source));
    }

    const linkElems = documentRoot.querySelectorAll(`link[href]`);
    const links: { href: string, rel: string | undefined; }[] = [];

    for (const e of linkElems) {
        const hrefAttr = e.getAttribute("href")!;
        const rel = e.getAttribute("rel");
        if (!matchTargetFilter(options.bundleTargets, hrefAttr)) {
            continue;
        }
        e.remove();
        entryPoints.push(hrefAttr);
        const href = path.normalize(hrefAttr);
        links.push({ href, rel });
    }

    const document = documentRoot.getElementsByTagName("html")[0];

    for (const source of scriptSources) {
        const ext = path.extname(source);
        const base = path.common([path.normalize(options.outbase), source]);
        const src = source.substring(base.length, source.length - ext.length);
        const scriptElem = parseDOM(`<script type="module" src="${src}.js"></script>`);
        document.appendChild(scriptElem);
    }

    for (const { href, rel } of links) {
        const base = path.common([path.normalize(options.outbase), href]);
        const src = href.substring(base.length);
        const relAttr = rel === undefined ? "" : `rel="${rel}"`;
        const linkElem = parseDOM(`<link ${relAttr} href="${src}"></script>`);
        document.appendChild(linkElem);
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