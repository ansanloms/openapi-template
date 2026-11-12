import { execFile } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { promisify } from "node:util";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { parse } from "yaml";

const execFileAsync = promisify(execFile);

const VIRTUAL_ID = "virtual:spec";
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

// spec の $ref 先として有り得る拡張子と、監視から除くディレクトリ。
// node_modules と .git はどの階層でも除く。それ以外はリポジトリ直下だけで除く。全階層に効かせると components/src のような spec 側のディレクトリが落ちるため。
// 直下のドット始まりのディレクトリ (.claude・.cache・.github・.direnv・.venv 等) は、spec を置かない前提でツールの生成物を監視しないよう、一括で除く。
const WATCH_EXTENSIONS = new Set([".yaml", ".yml", ".json", ".md"]);
const WATCH_IGNORE_ANYWHERE = new Set(["node_modules", ".git"]);
const WATCH_IGNORE_TOP = new Set(["dist", "src"]);

// ディレクトリ名 name を監視から除くか。top はリポジトリ直下のディレクトリかどうか。
function isIgnoredDir(name: string, top: boolean): boolean {
  return (
    WATCH_IGNORE_ANYWHERE.has(name) || (top && (name.startsWith(".") || WATCH_IGNORE_TOP.has(name)))
  );
}

// file が spec の依存になり得るファイルか。$ref 先の一覧は CLI から得られないため、パスで判定する。
function isSpecFile(file: string): boolean {
  const rel = path.relative(import.meta.dirname, file);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    return false;
  }
  const dirs = rel.split(path.sep).slice(0, -1);
  return (
    WATCH_EXTENSIONS.has(path.extname(rel)) && !dirs.some((name, i) => isIgnoredDir(name, i === 0))
  );
}

// redocly bundle の結果 (YAML 文字列) を返す。
// @redocly/openapi-core は単独では入っておらず API も内部利用向けのため、CLI を子プロセスで呼ぶ。
// .bin/redocly は Windows でシェルを要するので、bin の実体の JS を現在の node で直接実行する。
async function bundleSpec(): Promise<string> {
  const pkgPath = createRequire(import.meta.url).resolve("@redocly/cli/package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const cli = path.resolve(path.dirname(pkgPath), pkg.bin.redocly);
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [cli, "bundle", "./api.yaml", "--config", "./redocly.yaml", "--ext", "yaml"],
      // bundle 結果が標準出力に載るため、大きな spec でも切れないよう余裕を持たせる。
      { cwd: import.meta.dirname, maxBuffer: 256 * 1024 * 1024 },
    );
    return stdout;
  } catch (e) {
    const stderr = (e as { stderr?: string }).stderr ?? "";
    throw new Error(`redocly bundle に失敗した:\n${stderr || String(e)}`);
  }
}

// build --watch の addWatchFile 用に、isSpecFile を満たすファイルを列挙する。
function listWatchFiles(dir: string, top = true): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return isIgnoredDir(entry.name, top) ? [] : listWatchFiles(full, false);
    }
    return WATCH_EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
  });
}

// dev の watcher に登録する対象。リポジトリ直下の除外されないディレクトリと、直下の spec 系ファイル。
// 直下そのものを登録すると dist や .claude も再帰で監視するため、個別に選ぶ。
function listWatchRoots(): string[] {
  const root = import.meta.dirname;
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return isIgnoredDir(entry.name, true) ? [] : [full];
    }
    return WATCH_EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
  });
}

// spec を bundle して、仮想モジュール virtual:spec・<title>・dist/api.yaml に渡す。
function spec(): Plugin {
  // load / transformIndexHtml / generateBundle で bundle を 1 回に共有する。
  let bundled: Promise<string> | undefined;
  // 無効化 (hotUpdate / watchChange) のたびに進める。待っている間に無効化された bundle の結果を使わないための印。
  let generation = 0;
  let server: ViteDevServer | undefined;

  const invalidate = () => {
    generation++;
    bundled = undefined;
  };

  // 待っている間に無効化された場合は結果を使わず、取り直す。取り直しは無効化が起きたときだけなので、編集が止まれば必ず終わる。
  // 失敗は、同じ bundle を待っていた全員が同じエラーを受け取る。
  const getSpec = async (): Promise<string> => {
    for (;;) {
      const gen = generation;
      const p = (bundled ??= bundleSpec());
      try {
        const yaml = await p;
        if (gen === generation) {
          return yaml;
        }
      } catch (e) {
        if (gen === generation) {
          // dev で失敗を保持し続けると次の編集で再試行できないため捨てる。
          if (bundled === p) {
            bundled = undefined;
          }
          throw e;
        }
      }
    }
  };

  return {
    name: "spec",
    // 起動時に spec が壊れていても、直したときに変更を拾えるよう、bundle の成否と無関係に監視を登録する。
    // 新規ファイルも述語 (isSpecFile) で拾うため、ファイルの列挙はしない。
    configureServer(devServer) {
      server = devServer;
      server.watcher.add(listWatchRoots());
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : undefined;
    },
    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) {
        return;
      }
      // vite build --watch は addWatchFile したファイルしか見ないため、dev でも同じ列挙を渡す。
      for (const file of listWatchFiles(import.meta.dirname)) {
        this.addWatchFile(file);
      }
      const yaml = await getSpec();
      return `export default ${JSON.stringify(yaml)};`;
    },
    // <title> を spec の info.title から入れる。
    async transformIndexHtml() {
      const doc = parse(await getSpec());
      // Vite は tag の children を escape しない (escape するのは attrs だけ) ため、ここで行う。
      const title = String(doc.info.title)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
      return [{ tag: "title", children: title, injectTo: "head-prepend" }];
    },
    // buildStart で emit すると dev で警告が出るため、build 専用のここで出す。
    async generateBundle() {
      this.emitFile({ type: "asset", fileName: "api.yaml", source: await getSpec() });
    },
    // vite build --watch ではこちらだけが呼ばれ、dev では hotUpdate より前にも呼ばれる。
    // dev では 1 回の保存で hotUpdate と二重に無効化されるが害は無い (稀に bundle が 1 回余分に走るだけ)。
    watchChange(id) {
      if (isSpecFile(id)) {
        invalidate();
      }
    },
    // dev 専用。watchChange の後に呼ばれ、同じ変更をもう一度無効化する (上記のとおり害は無い)。
    hotUpdate({ file }) {
      if (!isSpecFile(file)) {
        return;
      }
      invalidate();
      // dev の起動後に直下へ作られたディレクトリを watcher に加える (冪等)。
      // 直下の新しいディレクトリは、既存の監視済みファイルが変わった時点で拾われる。それ以前にそこへ作ったファイルは検知されない。
      server?.watcher.add(listWatchRoots());
      if (this.environment.name !== "client") {
        return;
      }
      // modules には変更したファイル自身のモジュールしか入らず、仮想モジュールは入らないため、自分で無効化して全体を再読み込みする。
      const mod = this.environment.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
      if (mod) {
        this.environment.moduleGraph.invalidateModule(mod);
      }
      this.environment.hot.send({ type: "full-reload" });
      return [];
    },
  };
}

export default defineConfig({
  // index.html を src/ に置く。
  root: "src",
  // サブパス配下 (GitHub Pages のプロジェクトサイト) でも assets を解決できるよう、相対パスで参照する。
  base: "./",
  // Elements の依存が Node のグローバル (global 等) を前提にしており、無いと実行時に `global is not defined` で落ちるため。
  plugins: [react(), nodePolyfills(), spec()],
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
