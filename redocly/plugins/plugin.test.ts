import assert from "node:assert/strict";
import { test } from "node:test";

import { createPlugin, expectedOperationId } from "./plugin.ts";

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

test("createPlugin は既定の規約で operation-id-naming・description-file-naming・examples-layout・no-unreferenced-files を持つ", () => {
  const plugin = createPlugin({ id: "x" })();
  assert.equal(plugin.id, "x");
  assert.deepEqual(Object.keys(plugin.rules.oas3).sort(), [
    "description-file-naming",
    "examples-layout",
    "no-unreferenced-files",
    "operation-id-naming",
  ]);
});
