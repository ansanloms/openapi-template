import { spawnSync } from "node:child_process";

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error("Usage: node ./bin/run.ts <script> [<script> ...]");
  process.exit(1);
}

// シェルのメタ文字を通さないため、実行前に全件検査する。
// 先頭を英数字に限るのは、`-` で始まる名前が npm のオプションとして解釈されるのを防ぐため。
const invalid = names.filter((name) => !/^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(name));
if (invalid.length > 0) {
  console.error(`Invalid script name: ${invalid.join(", ")}`);
  process.exit(1);
}

// Windows の npm.cmd はシェル経由が要る。args 配列との併用は DEP0190 のため 1 つの文字列で渡す。
// 途中で失敗しても続行し、終了コードは最後の script のものにする。
let exitCode = 0;
for (const name of names) {
  const result = spawnSync(`npm run ${name}`, { shell: true, stdio: "inherit" });
  if (result.error) {
    console.error(`Failed to start script: ${name}`, result.error);
  }
  exitCode = result.error || result.status === null ? 1 : result.status;
}
process.exitCode = exitCode;
