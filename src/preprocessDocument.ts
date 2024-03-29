import { BUNDLE_TARGET_ATTRIBUTE, STATIC_RESOURCE_ATTRIBUTE } from "./builder.ts";
import { posixPath } from "./deps/std.ts";
import { InternalBuilderOptionsWithDocument } from "./options.ts";
import { isURL, tryRelative } from "./util.ts";
import { HTMLElement } from "npm:node-html-parser";
export function preprocessDocument(options: InternalBuilderOptionsWithDocument, documentRoot: HTMLElement) {
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
