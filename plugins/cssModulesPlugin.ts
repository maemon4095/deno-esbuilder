import cssModules from "npm:postcss-modules";
import * as path from "https://deno.land/std@0.207.0/path/mod.ts";
import esbuild from "https://raw.githubusercontent.com/maemon4095/tauri-deno-builder/main/src/deps/esbuild.ts";
import postcss from "npm:postcss";

// deno-lint-ignore no-explicit-any
type InferArgs<T extends (arg: any) => any> = T extends ((arg: infer X) => any) ? X : never;

export type CssModulesOptions = InferArgs<typeof cssModules>;
export function cssModulePlugin(options: Omit<CssModulesOptions, "getJSON">): esbuild.Plugin {
  const resultStore: {
    [file: string]: {
      css?: string,
      map: { [name: string]: string; };
    };
  } = {};
  const name = cssModulePlugin.name;

  const plugin = cssModules({
    ...options,
    getJSON(cssFileName, json) {
      resultStore[cssFileName] = { map: json };
    }
  });

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

        let dir;
        if (args.importer) {
          dir = path.dirname(args.importer);
        } else {
          dir = args.resolveDir;
        }
        return {
          path: path.join(dir, args.path),
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