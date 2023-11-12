import esbuild from "./deps/esbuild.ts";
export type BuilderOptions = Partial<CompleteBuilderOptions>;
export type CompleteBuilderOptions = {
    esbuildPlugins: esbuild.Plugin[];
    outdir: string,
    outbase: string;
    documentFilePath: string;
    serve: ServeOptions;
    esbuildOptions?: esbuild.BuildOptions,
    dropLabels: string[];
    minifySyntax: boolean;
    staticResources: string[];
    denoConfigPath?: string;
    importMapURL?: string;
    nodeModulesDir?: boolean;
    denoPluginLoader?: "native" | "portable";
};

export type ServeOptions = {
    port: number;
    watch: (string | { path: string, recursive: boolean; })[];
};
