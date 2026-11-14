import type { Oas3Rule } from "@redocly/openapi-core";

import { createTopLevelPathTracker } from "./top-level-path.ts";

const toPascalCase = (segment: string): string =>
  segment
    .split(/[^A-Za-z0-9]/)
    .filter((v) => v.length > 0)
    .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
    .join("");

/** メソッドとパスから期待する operationId を返す関数の型。plugin に注入できる。 */
export type ExpectedOperationId = (method: string, path: string) => string;

/**
 * パスと HTTP メソッドから期待される operationId を算出する。
 *
 * - メソッド(小文字) + 各セグメントの PascalCase 連結。
 * - 各セグメントは英数字以外の文字 (`-`・`_`・`.` 等) で単語に分割し、各単語の
 *   先頭を大文字にして連結する (例: `/sitemap.xml` -> `SitemapXml`)。
 * - `{param}` は波括弧を除去して同様に変換し、常に含める (例: `/code/{code}` -> `CodeCode`)。
 */
export const expectedOperationId: ExpectedOperationId = (method, path) => {
  const parts = path
    .split("/")
    .filter((v) => v.length > 0)
    .map((segment) => toPascalCase(/^\{(.+)\}$/.exec(segment)?.[1] ?? segment));

  return method.toLowerCase() + parts.join("");
};

export const createOperationIdNaming =
  (expected: ExpectedOperationId): Oas3Rule =>
  () => {
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
          const path = tracker.current();
          if (path === undefined) {
            return;
          }

          if (typeof target?.operationId !== "string") {
            return;
          }

          const expectedId = expected(String(ctx.key), path);
          if (target.operationId !== expectedId) {
            ctx.report({
              message: `operationId が命名規則に従っていません (actual: ${target.operationId}, expected: ${expectedId})。`,
              location: ctx.location.child(["operationId"]),
            });
          }
        },
      },
    };
  };
