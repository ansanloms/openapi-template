import { readFileSync } from "node:fs";
import * as path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { parse } from "yaml";

// <title> を spec の info.title から入れる。build:bundle が先に .cache/api.yaml を作る前提。
function specTitle(): Plugin {
  return {
    name: "spec-title",
    transformIndexHtml() {
      const spec = parse(readFileSync(path.join(import.meta.dirname, ".cache/api.yaml"), "utf8"));
      // Vite は tag の children を escape しない (escape するのは attrs だけ) ため、ここで行う。
      const title = String(spec.info.title)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
      return [{ tag: "title", children: title, injectTo: "head-prepend" }];
    },
  };
}

export default defineConfig({
  // index.html を src/ に置く。
  root: "src",
  // サブパス配下 (GitHub Pages のプロジェクトサイト) でも assets を解決できるよう、相対パスで参照する。
  base: "./",
  // Elements の依存が Node のグローバル (global 等) を前提にしており、無いと実行時に `global is not defined` で落ちるため。
  plugins: [react(), nodePolyfills(), specTitle()],
  server: { host: true, port: 4000 },
  build: {
    // root (src/) の外へ出力する。root の外は既定では空にされないため emptyOutDir を明示する。
    outDir: "../dist",
    emptyOutDir: true,
    // minify で第三者ライセンス表記が落ちるため、bundle した依存のライセンスを dist/licenses.md に出力する。
    // LICENSE ファイルを同梱しない依存は、名前・版・識別子の見出しだけになる。
    license: { fileName: "licenses.md" },
    rolldownOptions: {
      output: { postBanner: "/* Licenses of bundled dependencies: ../licenses.md */" },
    },
  },
});
