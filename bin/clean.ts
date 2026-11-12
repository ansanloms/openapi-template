import { rm } from "node:fs/promises";
import * as path from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node ./bin/clean.ts <dir>");
  process.exit(1);
}

// cwd 自身や cwd の外を誤って再帰削除しないよう、cwd の配下だけを対象にする。
const resolved = path.resolve(target);
const relative = path.relative(process.cwd(), resolved);
if (
  relative === "" ||
  relative === ".." ||
  relative.startsWith(`..${path.sep}`) ||
  path.isAbsolute(relative)
) {
  console.error(`Refusing to remove: not under the current directory: ${resolved}`);
  process.exit(1);
}

await rm(resolved, { recursive: true, force: true });
