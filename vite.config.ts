import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  // Elements の依存が Node のグローバル (global 等) を前提にしており、無いと実行時に `global is not defined` で落ちるため。
  plugins: [react(), nodePolyfills(), viteSingleFile()],
  server: { host: true, port: 4000 },
  build: {
    // minify で第三者ライセンス表記が落ちるため、bundle した依存のライセンスを dist/licenses.md に出力する。
    // LICENSE ファイルを同梱しない依存は、名前・版・識別子の見出しだけになる。
    license: { fileName: "licenses.md" },
    rolldownOptions: {
      output: { postBanner: "/* Licenses of bundled dependencies: ./licenses.md */" },
    },
  },
});
