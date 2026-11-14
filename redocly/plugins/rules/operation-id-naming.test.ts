import assert from "node:assert/strict";
import { test } from "node:test";

import { createOperationIdNaming, type ExpectedOperationId } from "./operation-id-naming.ts";

// 注入する規約の代わりに使う、メソッドとパスを連結するだけの関数。
const joinMethodAndPath: ExpectedOperationId = (method, path) => method + path;

// Redocly の visitor を模した最小の文脈でルールを駆動し、報告された operationId を返す。
type Step =
  | { kind: "enter"; key: string }
  | { kind: "leave" }
  | { kind: "operation"; method: string; operationId: string };

// ルールが返す visitor のうち、テストで呼ぶ部分だけを表す。
interface TestVisitor {
  PathItem: {
    enter: (target: unknown, ctx: { key: string }) => void;
    leave: () => void;
  };
  Operation: {
    enter: (
      target: { operationId: string },
      ctx: {
        key: string;
        location: { child: (path: string[]) => unknown };
        report: () => void;
      },
    ) => void;
  };
}

const runRule = (steps: Step[], expected: ExpectedOperationId = joinMethodAndPath): string[] => {
  const reported: string[] = [];
  const visitor = (
    createOperationIdNaming(expected) as unknown as (options: unknown) => TestVisitor
  )({});
  for (const step of steps) {
    if (step.kind === "enter") {
      visitor.PathItem.enter({}, { key: step.key });
    } else if (step.kind === "leave") {
      visitor.PathItem.leave();
    } else {
      visitor.Operation.enter(
        { operationId: step.operationId },
        {
          key: step.method,
          location: { child: () => ({}) },
          report: () => reported.push(step.operationId),
        },
      );
    }
  }
  return reported;
};

test("paths 直下の operation は検査する", () => {
  assert.deepEqual(
    runRule([
      { kind: "enter", key: "/carts" },
      { kind: "operation", method: "get", operationId: "wrong" },
      { kind: "operation", method: "post", operationId: "post/carts" },
      { kind: "leave" },
    ]),
    ["wrong"],
  );
});

test("関数を注入すると、その関数の返す値を期待値として判定する", () => {
  const fixed: ExpectedOperationId = () => "fixedId";
  assert.deepEqual(
    runRule(
      [
        { kind: "enter", key: "/carts" },
        { kind: "operation", method: "get", operationId: "get/carts" },
        { kind: "operation", method: "post", operationId: "fixedId" },
        { kind: "leave" },
      ],
      fixed,
    ),
    ["get/carts"],
  );
});

test("callback 内の operation は検査せず、後続の operation は検査する", () => {
  assert.deepEqual(
    runRule([
      { kind: "enter", key: "/carts" },
      { kind: "enter", key: "{$request.body#/url}" },
      { kind: "operation", method: "post", operationId: "callbackWhatever" },
      { kind: "leave" },
      { kind: "operation", method: "get", operationId: "wrong" },
      { kind: "leave" },
    ]),
    ["wrong"],
  );
});

test("webhooks と components.pathItems (key が / 始まりでない) は検査しない", () => {
  assert.deepEqual(
    runRule([
      { kind: "enter", key: "newOrder" },
      { kind: "operation", method: "post", operationId: "whatever" },
      { kind: "leave" },
    ]),
    [],
  );
});
