import type { Oas3Rule } from "@redocly/openapi-core";

import { createTopLevelPathTracker } from "./top-level-path.ts";

/** メソッドとパスから期待する operationId を返す関数の型。plugin に注入できる。 */
export type ExpectedOperationId = (method: string, path: string) => string;

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
