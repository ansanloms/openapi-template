import assert from "node:assert/strict";
import { test } from "node:test";

import { DescriptionFileNaming } from "./description-file-naming.ts";

// Redocly の visitor を模した最小の文脈でルールを駆動し、報告された内容を返す。
type Step =
  | { kind: "enter"; key: string }
  | { kind: "leave" }
  | { kind: "operation"; operationId?: unknown; description?: unknown };

interface Reported {
  message: string;
  location: string[];
}

// ルールが返す visitor のうち、テストで呼ぶ部分だけを表す。
interface TestVisitor {
  PathItem: {
    enter: (target: unknown, ctx: { key: string }) => void;
    leave: () => void;
  };
  Operation: {
    enter: (
      target: { operationId?: unknown; description?: unknown },
      ctx: {
        key: string;
        location: { child: (path: string[]) => string[] };
        report: (problem: { message: string; location: string[] }) => void;
      },
    ) => void;
  };
}

const runRule = (steps: Step[]): Reported[] => {
  const reported: Reported[] = [];
  const visitor = (DescriptionFileNaming as unknown as (options: unknown) => TestVisitor)({});
  for (const step of steps) {
    if (step.kind === "enter") {
      visitor.PathItem.enter({}, { key: step.key });
    } else if (step.kind === "leave") {
      visitor.PathItem.leave();
    } else {
      visitor.Operation.enter(
        { operationId: step.operationId, description: step.description },
        {
          key: "post",
          location: { child: (path) => path },
          report: (problem) => reported.push(problem),
        },
      );
    }
  }
  return reported;
};

const ref = (name: string) => ({ $ref: `./descriptions/${name}.md` });

test("ファイル名と operationId が一致していれば報告しない", () => {
  assert.deepEqual(
    runRule([
      { kind: "enter", key: "/carts" },
      { kind: "operation", operationId: "postCarts", description: ref("postCarts") },
      { kind: "leave" },
    ]),
    [],
  );
});

test("ファイル名と operationId が不一致なら description.$ref の位置に報告する", () => {
  const reported = runRule([
    { kind: "enter", key: "/carts" },
    { kind: "operation", operationId: "postCarts", description: ref("PostCarts") },
    { kind: "leave" },
  ]);
  assert.equal(reported.length, 1);
  assert.deepEqual(reported[0]!.location, ["description", "$ref"]);
  assert.match(reported[0]!.message, /actual: PostCarts/);
  assert.match(reported[0]!.message, /expected: postCarts/);
});

test("callback 内の operation は検査せず、後続の operation は検査する", () => {
  const reported = runRule([
    { kind: "enter", key: "/carts" },
    { kind: "enter", key: "{$request.body#/url}" },
    { kind: "operation", operationId: "callbackOp", description: ref("other") },
    { kind: "leave" },
    { kind: "operation", operationId: "postCarts", description: ref("wrong") },
    { kind: "leave" },
  ]);
  assert.equal(reported.length, 1);
  assert.match(reported[0]!.message, /actual: wrong/);
});

test("インラインの description は検査しない", () => {
  assert.deepEqual(
    runRule([
      { kind: "enter", key: "/carts" },
      { kind: "operation", operationId: "postCarts", description: "inline text" },
      { kind: "operation", operationId: "getCarts" },
      { kind: "leave" },
    ]),
    [],
  );
});

test("./descriptions/<x>.md 形でない $ref は検査しない", () => {
  assert.deepEqual(
    runRule([
      { kind: "enter", key: "/carts" },
      { kind: "operation", operationId: "postCarts", description: { $ref: "../other/foo.md" } },
      {
        kind: "operation",
        operationId: "getCarts",
        description: { $ref: "./descriptions/sub/foo.md" },
      },
      {
        kind: "operation",
        operationId: "putCarts",
        description: { $ref: "./descriptions/foo.txt" },
      },
      { kind: "leave" },
    ]),
    [],
  );
});

test("operationId が無い operation は検査しない", () => {
  assert.deepEqual(
    runRule([
      { kind: "enter", key: "/carts" },
      { kind: "operation", description: ref("anything") },
      { kind: "leave" },
    ]),
    [],
  );
});

test("webhooks と components.pathItems (key が / 始まりでない) は検査しない", () => {
  assert.deepEqual(
    runRule([
      { kind: "enter", key: "newOrder" },
      { kind: "operation", operationId: "postNewOrder", description: ref("wrong") },
      { kind: "leave" },
    ]),
    [],
  );
});
