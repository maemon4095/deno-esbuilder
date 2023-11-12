import { BuilderOptions, BuilderProfile, ProfileName, ServeOptions } from "./options.ts";
import { denoPlugins } from "./deps/esbuild_deno_loader.ts";
import { coalesce } from "./deps/coalesce.ts";
import esbuild from "./deps/esbuild.ts";
import { parse as parseDOM } from "npm:node-html-parser";
import { fs, path } from "./deps/std.ts";
import { merge } from "./asyncIteratorExtensions.ts";

const defaultCommonOptions = {
    outdir: "./dist",
    esbuildPlugins: [],
    bundle: false,
    documentFilePath: "./index.html",
    serve: {
        port: 0,
        watch: ["src"]
    },
    esbuildOptions: undefined,
    staticResources: []
};


const defaultReleaseOptions: BuilderProfile = {
    ...defaultCommonOptions,
    dropLabels: ["DEV"],
    minifySyntax: true
};

const defaultDevOptions: BuilderProfile = {
    ...defaultCommonOptions,
    dropLabels: [],
    minifySyntax: false
};

export class Builder {
    #profileName: ProfileName;
    #profiles: { [p in ProfileName]: BuilderProfile };

    constructor(options: BuilderOptions) {
        const optReleaseOptions = { ...options, ...(options.release) };
        const optDevOptions = { ...options, ...(options.dev) };

        this.#profileName = options.profileName;
        this.#profiles = {
            release: coalesce(optReleaseOptions, defaultReleaseOptions),
            dev: coalesce(optDevOptions, defaultDevOptions),
        };
    }

    async build() {
        const profile = this.#getProfile();
        const context = await preprocess(profile);

        console.log("Building...");
        const result = await esbuild.build(context);
        console.log("Done build!");
        console.log(result);
        await context.dispose();
    }

    async serve(options: Partial<ServeOptions> = {}) {
        const profile = this.#getProfile();

        if (options.port !== undefined) {
            profile.serve.port = options.port;
        }
        if (options.watch !== undefined) {
            profile.serve.watch = options.watch;
        }

        const context = await preprocess(profile);

        const { host, port } = await context.serve({ port: profile.serve.port, servedir: profile.outdir, });

        const origin = host === "0.0.0.0" ? "localhost" : host;

        console.log(`Serving on http://${origin}:${port}`);

        const watcher = watch(profile.serve.watch);
        console.log("Watching...");


        for await (const e of watcher) {
            console.log(`File Update: (${e.kind}) ${e.paths}.`);
            await context.rebuild();
        }

        await context.dispose();
    }


    #getProfile() {
        return this.#profiles[this.#profileName];
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

export async function preprocess(profile: BuilderProfile) {
    const indexFile = await Deno.readTextFile(profile.documentFilePath);
    const documentRoot = parseDOM(indexFile);

    if (documentRoot === null) {
        throw new Error(`entry document was not exists.`);
    }

    const scriptElems = documentRoot.querySelectorAll(`script[type="module"][src]`);
    for (const s of scriptElems) {
        s.remove();
    }
    const scriptSources = scriptElems.map(s => s.getAttribute("src")!);
    const scriptElem = parseDOM(`<script type="module" src="/index.js"></script>`);

    const document = documentRoot.getElementsByTagName("html")[0];

    document.appendChild(scriptElem);

    await Deno.mkdir(profile.outdir);

    for (const r of profile.staticResources) {
        await fs.copy(r, profile.outdir, { overwrite: true });
    }

    const outIndexFilePath = path.join(profile.outdir, path.basename(profile.documentFilePath));
    const outIndexFile = await Deno.create(path.join(profile.outdir, outIndexFilePath));
    await outIndexFile.write(new TextEncoder().encode(documentRoot.toString()));

    const esbuildOptions: esbuild.BuildOptions = {
        ...profile.esbuildOptions,
        plugins: [
            ...profile.esbuildPlugins,
            ...denoPlugins({
                configPath: profile.denoConfigPath,
                importMapURL: profile.importMapURL,
                nodeModulesDir: profile.nodeModulesDir,
                loader: profile.denoPluginLoader
            })
        ],
        entryPoints: scriptSources,
        outdir: profile.outdir,
        bundle: profile.bundle,
        format: "esm",
        platform: "browser"
    };


    return await esbuild.context(esbuildOptions);
}