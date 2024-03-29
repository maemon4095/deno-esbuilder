import { BuilderOptions, InternalBuilderCommonOptions, InternalBuilderOptionsWithEntryPoints, InternalBuilderOptions, InternalBuilderOptionsWithDocument, InternalServeOptions, ServeOptions } from "./options.ts";
import { denoPlugins } from "./deps/esbuild_deno_loader.ts";
import esbuild from "./deps/esbuild.ts";
import { HTMLElement, parse as parseDOM } from "npm:node-html-parser";
import { fs, posixPath } from "./deps/std.ts";
import { merge } from "./asyncIteratorExtensions.ts";
import { path } from "./deps/std.ts";

export const BUNDLE_TARGET_ATTRIBUTE = "data-esbuilder-bundle";
export const STATIC_RESOURCE_ATTRIBUTE = "data-esbuilder-static";

export class Builder {
    #options: InternalBuilderOptions;
    constructor(options: BuilderOptions) {
        this.#options = preprocessOptions(options);
    }

    async build() {
        const options = this.#options;
        const { context } = await preprocess(options);

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
        const { context, staticResources } = await preprocess(builderOptions);
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


export function watch(targets: (string | { path: string, recursive: boolean; })[]) {
    const recursives = targets.flatMap(t => typeof t === "string" ? [t] : t.recursive ? [t.path] : []);
    const shallows = targets.flatMap(t => typeof t === "string" ? [] : t.recursive ? [] : [t.path]);

    const watchers = recursives
        .map(t => Deno.watchFs(t))
        .concat(shallows.map(t => Deno.watchFs(t, { recursive: false })));

    return merge(...watchers);
}

export async function preprocess(options: InternalBuilderOptions) {
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

function preprocessDocument(options: InternalBuilderOptionsWithDocument, documentRoot: HTMLElement) {
    const entryPoints: string[] = [];
    const staticResources: [string, string][] = []; // absolute resource path and document relative resource path pair
    // convert document relative path to normalized path relative to current dir
    const normalizeDocumentRelativePath = (() => {
        const base = posixPath.dirname(options.documentFilePath);
        return (p: string) => posixPath.normalize(posixPath.join(base, p));
    })();

    const ordinaryTargetElems = (() => {
        const links = documentRoot.querySelectorAll("link[href]");
        const anchors = documentRoot.querySelectorAll("a[href]");
        const hrefs = links.concat(anchors).map(e => ["href", e] as [string, HTMLElement]);
        const sources = documentRoot.querySelectorAll("source[src]");
        const imgs = documentRoot.querySelectorAll("img[src]");
        const embeds = documentRoot.querySelectorAll("embed[src]");
        const audios = documentRoot.querySelectorAll("audio[src]");
        const srcs = sources.concat(imgs, embeds, audios).map(e => ["src", e] as [string, HTMLElement]);
        const objects = documentRoot.querySelectorAll("object[data]");
        const datas = objects.map(e => ["data", e] as [string, HTMLElement]);
        return hrefs.concat(srcs, datas);
    })();

    for (const e of documentRoot.querySelectorAll(`script[src]`)) {
        const rawsource = e.getAttribute("src")!;
        if (e.hasAttribute(BUNDLE_TARGET_ATTRIBUTE)) {
            if (e.getAttribute("type") !== "module") throw new Error("bundle target script type must be module.");
            if (isURL(rawsource)) throw new Error("bundle remote script is not supported.");
            const source = normalizeDocumentRelativePath(rawsource);
            const ext = posixPath.extname(source);
            const src = tryRelative(options.outbase, source.substring(0, source.length - ext.length));
            e.setAttribute("src", `${src}.js`);
            entryPoints.push(source);
            continue;
        }
        if (e.hasAttribute(STATIC_RESOURCE_ATTRIBUTE)) {
            if (isURL(rawsource)) throw new Error("embed remote script is not supported.");
            const source = normalizeDocumentRelativePath(rawsource);
            const src = tryRelative(options.outbase, source);
            e.setAttribute("src", src);
            staticResources.push([posixPath.resolve(source), src]);
            continue;
        }
    }

    for (const e of documentRoot.querySelectorAll(`sources[srcset]`)) {
        if (e.hasAttribute(BUNDLE_TARGET_ATTRIBUTE)) {
            throw new Error("bundle source element with srcset attribute is not supported.");
        }

        if (e.hasAttribute(STATIC_RESOURCE_ATTRIBUTE)) {
            throw new Error("embed source element with srcset attribute is not supported.");
        }
    }

    for (const [attrName, e] of ordinaryTargetElems) {
        const rawAttr = e.getAttribute(attrName)!;
        const attr = normalizeDocumentRelativePath(rawAttr);
        if (e.hasAttribute(BUNDLE_TARGET_ATTRIBUTE)) {
            if (isURL(attr)) throw new Error("bundle remote target is not supported.");
            const srcattr = tryRelative(options.outbase, attr);
            e.setAttribute(attrName, srcattr);
            entryPoints.push(attr);
            continue;
        }

        if (e.hasAttribute(STATIC_RESOURCE_ATTRIBUTE)) {
            if (isURL(attr)) throw new Error("embed remote resource is not supported.");
            const srcattr = tryRelative(options.outbase, attr);
            e.setAttribute(attrName, srcattr);
            staticResources.push([posixPath.resolve(attr), srcattr]);
            continue;
        }
    }

    return { entryPoints, staticResources };
}

function preprocessOptions(rawOptions: BuilderOptions): InternalBuilderOptions {
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

function isURL(str: string): boolean {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

function tryRelative(from: string, to: string) {
    const r = posixPath.normalize(posixPath.relative(from, to));
    if (r.startsWith("..")) {
        return to;
    }
    return r;
}

async function safeRemove(path: string) {
    if (await fs.exists(path)) {
        await Deno.remove(path, { recursive: true });
    }
}