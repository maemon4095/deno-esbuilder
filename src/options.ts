import { Optional } from "https://raw.githubusercontent.com/maemon4095/ts_components/main/utilities.ts";
import esbuild from "./deps/esbuild.ts";
export type BuilderOptions = Optional<BuilderProfile> & {
    profileName: ProfileName;
} & { [p in ProfileName]?: Optional<BuilderProfile>; };

export type BuilderProfile = {
    esbuildPlugins: esbuild.Plugin[];
    outdir: string,
    outbase: string,
    bundle: boolean;
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

export type ProfileName = "release" | "dev";