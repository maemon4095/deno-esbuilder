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
    denoConfigPath?: string;
    importMapURL?: string;
    nodeModulesDir?: boolean;
    denoPluginLoader?: "native" | "portable";
};

export type InternalBuilderCommonOptions = {
    esbuildPlugins: esbuild.Plugin[];
    esbuildPluginsLater: esbuild.Plugin[];
    outdir: string,
    outbase: string;
    serve: InternalServeOptions;
    esbuildOptions?: esbuild.BuildOptions,
    treeShaking: esbuild.BuildOptions["treeShaking"],
    sourcesContent?: esbuild.BuildOptions["sourcesContent"],
    sourceMap: esbuild.BuildOptions["sourcemap"],
    sourceRoot?: esbuild.BuildOptions["sourceRoot"],
    dropLabels: string[];
    minifySyntax: boolean;
    minifyIdentifiers: boolean,
    minifyWhitespace: boolean,
    denoConfigPath?: string;
    importMapURL?: string;
    nodeModulesDir?: boolean;
    denoPluginLoader?: "native" | "portable";
};

export type InternalBuilderOptions = InternalBuilderOptionsWithDocument | InternalBuilderOptionsWithEntryPoints;

export type InternalBuilderOptionsWithDocument = {
    documentFilePath: string;
} & InternalBuilderCommonOptions;

export type InternalBuilderOptionsWithEntryPoints = {
    entryPoints: [string, ...string[]],
} & InternalBuilderCommonOptions;

export type InternalServeOptions = {
    port: number;
    watch: (string | { path: string, recursive: boolean; })[];
};

export type ServeOptions = Partial<InternalServeOptions>;