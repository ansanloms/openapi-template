import fs from "node:fs";
import path from "node:path";

import { parseYaml, type Oas3Rule } from "@redocly/openapi-core";

/** `dir` 配下のファイルを列挙する。名前が `.` で始まるファイルとディレクトリ (配下を含む) は除く。 */
const listFiles = (dir: string): string[] =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((v) => v.isFile())
    .map((v) => path.join(v.parentPath, v.name))
    .filter(
      (v) =>
        !path
          .relative(dir, v)
          .split(path.sep)
          .some((s) => s.startsWith(".")),
    );

/**
 * 別名ファイル (`$ref: ./Next.yaml` だけを持つ YAML) なら、その参照先の絶対パスを返す。
 * 別名ファイルでない、読めない、パースできない場合は undefined。
 */
const aliasTarget = (file: string): string | undefined => {
  if (!/\.ya?ml$/.test(file)) {
    return undefined;
  }
  try {
    const value = parseYaml(fs.readFileSync(file, "utf8")) as unknown;
    if (typeof value !== "object" || value === null) {
      return undefined;
    }
    const keys = Object.keys(value);
    const ref = (value as { $ref?: unknown }).$ref;
    if (keys.length !== 1 || typeof ref !== "string" || ref.startsWith("#")) {
      return undefined;
    }
    const target = ref.split("#")[0]!;
    return target ? path.resolve(path.dirname(file), target) : undefined;
  } catch {
    return undefined;
  }
};

/** 参照済みのファイルから別名ファイルの連鎖を辿り、経路上のファイルも参照済みに加える。 */
const expandAliases = (referenced: Set<string>): void => {
  const queue = [...referenced];
  for (const file of queue) {
    const next = aliasTarget(file);
    if (next && !referenced.has(next)) {
      referenced.add(next);
      queue.push(next);
    }
  }
};

/**
 * どこからも $ref されていないファイルを検出する。
 *
 * 組み込みの `no-unused-components` は components.schemas に登録されたものしか検査しないため、
 * 登録されていない (= 参照も無い) ファイルは検出できない。本ルールは `dirs` 配下の全ファイルを列挙し、
 * 参照されていないものを報告する。
 *
 * 参照の集め方は 3 通りで、すべて集める。
 *
 * - `$ref` の文字列から求めた参照先。`resolve()` は別名ファイル (`$ref: ./Other.yaml` だけを持つファイル) の連鎖を
 *   終点まで辿って終点しか返さないため、終点だけでは経路上の別名ファイルが未参照に見えてしまう。
 * - `resolve()` の結果 (連鎖の終点)。
 * - 上の 2 つで得た参照先のうち別名ファイルを実際に読み、その `$ref` を辿った経路上のファイル。
 *   別名が 2 段以上続くと、`ref` の訪問は先頭の別名ファイルと終点だけで、途中の別名ファイルはどちらにも現れない。
 *
 * オプション `dirs` は root ファイルのあるディレクトリからの相対パス。未指定なら何も検査しない。
 * 指定したディレクトリが存在しない (またはディレクトリでない) 場合は、その旨を報告する。
 * 名前が `.` で始まるファイルとディレクトリ (`.gitkeep`・`.DS_Store`・`.foo/` 配下等) は検査対象にしない。
 * 報告の位置は root 直下の相対パスで、ファイル単位で lint-ignore できる。
 */
export const NoUnreferencedFiles: Oas3Rule = (opts: { dirs?: string[] } = {}) => {
  const dirs = opts.dirs ?? [];
  const referenced = new Set<string>();

  return {
    ref: {
      leave: (ref, { location, resolve }) => {
        const target = ref.$ref.split("#")[0]!;
        if (target) {
          referenced.add(path.resolve(path.dirname(location.source.absoluteRef), target));
        }

        const end = resolve(ref).location?.source.absoluteRef;
        if (end) {
          referenced.add(end);
        }
      },
    },
    Root: {
      leave: (_target, ctx) => {
        const root = ctx.location.source.absoluteRef;
        const base = path.dirname(root);
        expandAliases(referenced);

        for (const d of dirs) {
          const dir = path.join(base, d);
          if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
            ctx.report({
              message: `検査対象のディレクトリがありません (${d})。`,
              location: ctx.location.child([d]),
            });
            continue;
          }

          for (const file of listFiles(dir)) {
            if (file === root || referenced.has(file)) {
              continue;
            }

            const rel = path.relative(base, file).split(path.sep).join("/");
            ctx.report({
              message: `どこからも参照されていないファイルです (${rel})。`,
              location: ctx.location.child([rel]),
            });
          }
        }
      },
    },
  };
};
