import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createOperationIdNaming,
  type ExpectedOperationId,
  expectedOperationId,
} from "./operation-id-naming.ts";

test("リテラルセグメントと同名のパラメータも省略しない", () => {
  assert.equal(expectedOperationId("get", "/products/by/code/{code}"), "getProductsByCodeCode");
  assert.equal(expectedOperationId("get", "/by/code/{code}"), "getByCodeCode");
});

test("同名パラメータの有無で期待値が異なる (/code と /code/{code})", () => {
  assert.equal(expectedOperationId("get", "/code"), "getCode");
  assert.equal(expectedOperationId("get", "/code/{code}"), "getCodeCode");
});

test("パラメータは PascalCase に変換して残す", () => {
  assert.equal(expectedOperationId("get", "/products/{id}"), "getProductsId");
  assert.equal(
    expectedOperationId("delete", "/members/me/addresses/{address-id}"),
    "deleteMembersMeAddressesAddressId",
  );
  assert.equal(
    expectedOperationId("post", "/recommend/content/{measure_account_id}"),
    "postRecommendContentMeasureAccountId",
  );
});

test("英数字以外の文字で単語に分割する", () => {
  assert.equal(expectedOperationId("post", "/aid/receive"), "postAidReceive");
  assert.equal(expectedOperationId("get", "/sitemap.xml"), "getSitemapXml");
  assert.equal(expectedOperationId("get", "/gift-messagecards"), "getGiftMessagecards");
});

test("末尾スラッシュは無視する", () => {
  assert.equal(expectedOperationId("get", "/products/"), "getProducts");
});

test("連続するパラメータも省略しない", () => {
  assert.equal(expectedOperationId("get", "/a/{a}/{b}"), "getAAB");
});

test("ルートパスはメソッド名のみになる", () => {
  assert.equal(expectedOperationId("get", "/"), "get");
});

test("メソッドは小文字化する", () => {
  assert.equal(expectedOperationId("GET", "/carts"), "getCarts");
});

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

const runRule = (steps: Step[], expected: ExpectedOperationId = expectedOperationId): string[] => {
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
      { kind: "operation", method: "post", operationId: "postCarts" },
      { kind: "leave" },
    ]),
    ["wrong"],
  );
});

test("既定と異なる関数を注入すると、その関数の返す値を期待値として判定する", () => {
  const fixed: ExpectedOperationId = () => "fixedId";
  assert.deepEqual(
    runRule(
      [
        { kind: "enter", key: "/carts" },
        { kind: "operation", method: "get", operationId: "getCarts" },
        { kind: "operation", method: "post", operationId: "fixedId" },
        { kind: "leave" },
      ],
      fixed,
    ),
    ["getCarts"],
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
