import * as path from "@std/path";
import * as esbuild from "esbuild/mod.js";
import { denoPlugins } from "esbuild_deno_loader/mod.ts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

await esbuild.build({
  plugins: [...denoPlugins({
    configPath: path.join(__dirname, "../deno.json"),
    lockPath: path.join(__dirname, "../deno.lock"),
  })],
  entryPoints: [
    path.relative(
      Deno.cwd(),
      path.join(__dirname, "../redocly/plugins/index.ts"),
    ),
  ],
  outdir: path.join(__dirname, "../redocly/plugins"),
  format: "esm",
  bundle: true,
  minify: true,
});

esbuild.stop();
