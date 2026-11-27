import { existsSync } from "node:fs";
import { defineConfig, type HtmlTagDescriptor } from "vite";

const pallyUrl = "/fonts/Pally-Variable.woff2";
const localPally = new URL(`./public${pallyUrl}`, import.meta.url);

export default defineConfig({
  plugins: [
    {
      name: "optional-local-pally",
      transformIndexHtml(): HtmlTagDescriptor[] {
        if (!existsSync(localPally)) return [];

        return [
          {
            tag: "link",
            attrs: { rel: "preload", href: pallyUrl, as: "font", type: "font/woff2", crossorigin: true },
            injectTo: "head-prepend",
          },
          { tag: "link", attrs: { rel: "stylesheet", href: "/pally.css" } },
        ];
      },
    },
  ],
});
