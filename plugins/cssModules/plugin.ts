import cssModules from "npm:postcss-modules";
import { esbuild, posixPath } from "../util/deps.ts";
import { ImportMap, createResolverFromImportMap, defaultResolve } from "../util/resolver.ts";
import postcss from "npm:postcss";

// deno-lint-ignore no-explicit-any
type InferArgs<T extends (arg: any) => any> = T extends ((arg: infer X) => any) ? X : never;

export type CssModulesOptions = InferArgs<typeof cssModules>;
export default function cssModulePlugin(options?: CssModulesOptions & { importMap?: string | ImportMap; }): esbuild.Plugin {
  const resultStore: {
    [file: string]: {
      css?: string,
      map: { [name: string]: string; };
    };
  } = {};
  const name = cssModulePlugin.name;
  const { getJSON: getJSONOption, ...otherOptions } = options ?? {};

  const plugin = cssModules({
    ...otherOptions,
    getJSON(cssFileName, json, outputFilename) {
      resultStore[cssFileName] = { map: json };
      if (getJSONOption) getJSONOption(cssFileName, json, outputFilename);
    }
  });

  const importMapResolver = createResolverFromImportMap(otherOptions.importMap ?? {});

  const part_gen = `${name}-gen`;
  const part_emit = `${name}-emit-css`;

  return {
    name,
    setup(build) {
      build.onResolve({ filter: /.*module\.css$/ }, args => {
        if (args.namespace === part_gen) {
          return {
            path: args.path,
            namespace: part_emit
          };
        }

        return {
          path: importMapResolver(args.path) ?? defaultResolve(args),
          namespace: part_gen,
        };
      });

      build.onLoad({ filter: /.*/, namespace: part_gen }, async (args) => {
        const cssdata = await Deno.readFile(args.path);
        const cssfile = new TextDecoder().decode(cssdata);
        const result = await postcss([plugin]).process(cssfile, { from: args.path });

        const pair = resultStore[args.path];
        pair.css = result.css;

        return { contents: `import ${JSON.stringify(args.path)}; export default ${JSON.stringify(pair.map)};` };
      });

      build.onLoad({ filter: /.*/, namespace: part_emit }, args => {
        const pair = resultStore[args.path];
        return {
          contents: pair.css,
          loader: "css"
        };
      });
    }
  };
}