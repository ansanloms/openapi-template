import type { Oas3Rule } from "@redocly/openapi-core";

import { createTopLevelPathTracker } from "./top-level-path.ts";

// `./descriptions/<x>.md` 形の $ref。<x> はサブディレクトリを含まないファイル名 (拡張子なし)。
const DESCRIPTION_REF = /^\.\/descriptions\/([^/]+)\.md$/;

/**
 * operation の description を外部 md ファイルに切り出している場合、そのファイル名 (拡張子なし) を
 * operationId と一致させる。
 *
 * - 対象は paths 直下の operation の `description: { $ref: ./descriptions/<x>.md }` のみ。
 * - `<x>` が operationId と一致しなければ `description.$ref` の位置に報告する。
 * - `./descriptions/<x>.md` 形でない $ref、インラインの description、operationId の無い operation は検査しない。
 * - callbacks 内・webhooks・components.pathItems の operation は検査しない。
 */
export const DescriptionFileNaming: Oas3Rule = () => {
  const tracker = createTopLevelPathTracker();

  return {
    PathItem: {
      enter: (_target, ctx) => {
        tracker.enter(ctx.key);
      },
      leave: () => {
        tracker.leave();
      },
    },
    Operation: {
      enter: (target, ctx) => {
        // paths 直下の PathItem のみ対象とする。
        if (tracker.current() === undefined) {
          return;
        }

        // description は解決前の `{ $ref }` のまま渡される (型定義上は string)。
        const description: unknown = target?.description;
        const ref: unknown =
          typeof description === "object" && description !== null
            ? (description as { $ref?: unknown }).$ref
            : undefined;
        if (typeof ref !== "string" || typeof target?.operationId !== "string") {
          return;
        }

        const matched = DESCRIPTION_REF.exec(ref);
        if (!matched) {
          return;
        }

        const actual = matched[1]!;
        if (actual !== target.operationId) {
          ctx.report({
            message: `description のファイル名が operationId と一致していません (actual: ${actual}, expected: ${target.operationId})。`,
            location: ctx.location.child(["description", "$ref"]),
          });
        }
      },
    },
  };
};
