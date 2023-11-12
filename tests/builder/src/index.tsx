/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React from "react";
import App from "./App.tsx";
import ReactDOM from "react-dom/client";

// deno-lint-ignore no-unused-labels
DEV: {
  new EventSource("/esbuild").addEventListener("change", (e) => {
    const { added, removed, updated } = JSON.parse(e.data);

    if (!added.length && !removed.length && updated.length === 1) {
      for (const link of Array.from(document.getElementsByTagName("link"))) {
        const url = new URL(link.href);

        if (url.host === location.host && url.pathname === updated[0]) {
          const next = link.cloneNode() as HTMLLinkElement;
          next.href = updated[0] + "?" + Math.random().toString(36).slice(2);
          next.onload = () => link.remove();
          link.parentNode!.insertBefore(next, link.nextSibling);
          return;
        }
      }
    }

    location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
