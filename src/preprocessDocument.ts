import { BUNDLE_TARGET_ATTRIBUTE, STATIC_RESOURCE_ATTRIBUTE } from "./builder.ts";
import { path } from "./deps/std.ts";
import { InternalBuilderOptionsWithDocument } from "./options.ts";
import { isURL, replaceBackslash, tryRelative, withoutExt, relative, esbuildEscape } from "./util.ts";
import { HTMLElement } from "npm:node-html-parser";
export function preprocessDocument(options: InternalBuilderOptionsWithDocument, documentRoot: HTMLElement) {
    const entryPoints: string[] = [];
    const staticResources: [string, string][] = []; // absolute resource path and document relative resource path pair
    // convert document relative path to relative from current dir 
    const normalizeDocumentRelativePath = (() => {
        return (p: string) => path.normalize(path.join(options.documentFileDir, p));
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
        const ty = preprocessElem(e);

        switch (ty) {
            case "bundle": {
                if (e.getAttribute("type") !== "module") throw new Error("bundle target script type must be module.");
                if (isURL(rawsource)) throw new Error("bundle remote script is not supported.");
                const source = normalizeDocumentRelativePath(rawsource);
                let src = tryRelative(options.outbase, source) ?? relative(options.documentFileDir, source);
                src = esbuildEscape(replaceBackslash(src));
                e.setAttribute("src", `${withoutExt(src)}.js`);
                entryPoints.push(source);
                break;
            }
            case "static": {
                if (isURL(rawsource)) throw new Error("embed remote script is not supported.");
                const source = normalizeDocumentRelativePath(rawsource);
                let src = tryRelative(options.outbase, source) ?? relative(options.documentFileDir, source);
                src = esbuildEscape(replaceBackslash(src));
                e.setAttribute("src", src);
                staticResources.push([path.resolve(source), src]);
                break;
            }
        }
    }

    for (const e of documentRoot.querySelectorAll(`sources[srcset]`)) {
        const ty = preprocessElem(e);
        switch (ty) {
            case "bundle":
                throw new Error("bundle source element with srcset attribute is not supported.");
            case "static":
                throw new Error("embed source element with srcset attribute is not supported.");
        }
    }

    for (const [attrName, e] of ordinaryTargetElems) {
        const rawAttr = e.getAttribute(attrName)!;
        const attr = normalizeDocumentRelativePath(rawAttr);
        const ty = preprocessElem(e);

        switch (ty) {
            case "bundle": {
                if (isURL(attr)) throw new Error("bundle remote target is not supported.");
                let srcattr = tryRelative(options.outbase, attr) ?? relative(options.documentFileDir, attr);
                srcattr = esbuildEscape(replaceBackslash(srcattr));
                e.setAttribute(attrName, srcattr);
                entryPoints.push(attr);
                break;
            }
            case "static": {
                if (isURL(attr)) throw new Error("embed remote resource is not supported.");
                let srcattr = tryRelative(options.outbase, attr) ?? relative(options.documentFileDir, attr);
                srcattr = esbuildEscape(replaceBackslash(srcattr));
                e.setAttribute(attrName, srcattr);
                staticResources.push([path.resolve(attr), srcattr]);
                break;
            }
        }
    }

    return { entryPoints, staticResources };
}

type TargetType = "static" | "bundle" | null;

function preprocessElem(e: HTMLElement): TargetType {
    const isBundleTarget = e.hasAttribute(BUNDLE_TARGET_ATTRIBUTE);
    const isStaticResource = e.hasAttribute(STATIC_RESOURCE_ATTRIBUTE);

    if (isBundleTarget && isStaticResource) {
        throw new Error("content cannot be both static resource and bundle target.");
    }

    if (isBundleTarget) {
        e.removeAttribute(BUNDLE_TARGET_ATTRIBUTE);
        return "bundle";
    };
    if (isStaticResource) {
        e.removeAttribute(BUNDLE_TARGET_ATTRIBUTE);
        return "static";
    }
    return null;
}