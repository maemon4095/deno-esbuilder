import esbuild from "./deps/esbuild.ts";
export type BuilderOptions = {
    esbuildPlugins?: esbuild.Plugin[];
    outdir?: string,
    outbase?: string;
    documentFilePath?: string;
    serve?: ServeOptions;
    esbuildOptions?: esbuild.BuildOptions,
    treeShaking?: esbuild.BuildOptions["treeShaking"],
    sourcesContent?: esbuild.BuildOptions["sourcesContent"],
    sourceMap?: esbuild.BuildOptions["sourcemap"],
    sourceRoot?: esbuild.BuildOptions["sourceRoot"],
    dropLabels?: string[];
    minifySyntax?: boolean;
    staticResources?: string[];
    denoConfigPath?: string;
    importMapURL?: string;
    nodeModulesDir?: boolean;
    bundleTargets?: (RegExp | string)[];
    denoPluginLoader?: "native" | "portable";
};

export type CompleteBuilderOptions = {
    esbuildPlugins: esbuild.Plugin[];
    outdir: string,
    outbase: string;
    documentFilePath: string;
    serve: CompleteServeOptions;
    esbuildOptions?: esbuild.BuildOptions,
    treeShaking: esbuild.BuildOptions["treeShaking"],
    sourcesContent?: esbuild.BuildOptions["sourcesContent"],
    sourceMap: esbuild.BuildOptions["sourcemap"],
    sourceRoot?: esbuild.BuildOptions["sourceRoot"],
    dropLabels: string[];
    minifySyntax: boolean;
    staticResources: string[];
    denoConfigPath?: string;
    importMapURL?: string;
    nodeModulesDir?: boolean;
    bundleTargets: (RegExp | string)[];
    denoPluginLoader?: "native" | "portable";
};

export type CompleteServeOptions = {
    port: number;
    watch: (string | { path: string, recursive: boolean; })[];
};

export type ServeOptions = Partial<CompleteServeOptions>;