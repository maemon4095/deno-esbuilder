import esbuild from "./deps/esbuild.ts";
export type BuilderOptions = BuilderOptionsWithDocument | BuilderOptionsWithEntryPoints;

export type BuilderOptionsWithDocument = {
    documentFilePath: string;
} & BuilderCommonOptions;

export type BuilderOptionsWithEntryPoints = {
    entryPoints: string[],
} & BuilderCommonOptions;

export type BuilderCommonOptions = {
    /** esbuild plugins inserted before DenoPlugin */
    esbuildPlugins?: esbuild.Plugin[];
    /** esbuild plugins inserted after DenoPlugin */
    esbuildPluginsLater?: esbuild.Plugin[];
    outdir?: string,
    outbase?: string;
    serve?: ServeOptions;
    esbuildOptions?: esbuild.BuildOptions,
    treeShaking?: esbuild.BuildOptions["treeShaking"],
    sourcesContent?: esbuild.BuildOptions["sourcesContent"],
    sourceMap?: esbuild.BuildOptions["sourcemap"],
    sourceRoot?: esbuild.BuildOptions["sourceRoot"],
    dropLabels?: string[];
    minifySyntax?: boolean;
    minifyIdentifiers?: boolean,
    minifyWhitespace?: boolean,
    staticResources?: string[];
    denoConfigPath?: string;
    importMapURL?: string;
    nodeModulesDir?: boolean;
    bundleTargets?: (RegExp | string)[];
    denoPluginLoader?: "native" | "portable";
};

export type CompleteBuilderCommonOptions = {
    esbuildPlugins: esbuild.Plugin[];
    esbuildPluginsLater: esbuild.Plugin[];
    outdir: string,
    outbase: string;
    serve: CompleteServeOptions;
    esbuildOptions?: esbuild.BuildOptions,
    treeShaking: esbuild.BuildOptions["treeShaking"],
    sourcesContent?: esbuild.BuildOptions["sourcesContent"],
    sourceMap: esbuild.BuildOptions["sourcemap"],
    sourceRoot?: esbuild.BuildOptions["sourceRoot"],
    dropLabels: string[];
    minifySyntax: boolean;
    minifyIdentifiers: boolean,
    minifyWhitespace: boolean,
    staticResources: string[];
    denoConfigPath?: string;
    importMapURL?: string;
    nodeModulesDir?: boolean;
    bundleTargets: (RegExp | string)[];
    denoPluginLoader?: "native" | "portable";
};

export type CompleteBuilderOptions = CompleteBuilderOptionsWithDocument | CompleteBuilderOptionsWithEntryPoints;

export type CompleteBuilderOptionsWithDocument = {
    documentFilePath: string;
} & CompleteBuilderCommonOptions;

export type CompleteBuilderOptionsWithEntryPoints = {
    entryPoints: [string, ...string[]],
} & CompleteBuilderCommonOptions;

export type CompleteServeOptions = {
    port: number;
    watch: (string | { path: string, recursive: boolean; })[];
};

export type ServeOptions = Partial<CompleteServeOptions>;