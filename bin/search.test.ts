import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import * as yaml from "yaml";

const script = path.join(import.meta.dirname, "search.ts");

type Entry = {
  method: string;
  path: string;
  operationId: string;
  summary: string;
  schemas: string[];
};

// fixture を一時ファイルに書き、そのパスを渡して fn を実行する。
const withTarget = <T>(spec: unknown, fn: (target: string) => T): T => {
  const dir = mkdtempSync(path.join(tmpdir(), "search-test-"));
  try {
    const target = path.join(dir, "api.yaml");
    writeFileSync(target, yaml.stringify(spec));
    return fn(target);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// bundle 済みを想定した fixture で search.ts を実行し、標準出力の JSON を返す。
const runSearch = (spec: unknown): Entry[] =>
  withTarget(spec, (target) =>
    JSON.parse(execFileSync(process.execPath, [script, "--target", target], { encoding: "utf8" })),
  );

// 失敗を期待する fixture で search.ts を実行し、終了コードと標準出力・標準エラーを返す。
const runSearchRaw = (spec: unknown) =>
  withTarget(spec, (target) => {
    const { status, stdout, stderr } = spawnSync(process.execPath, [script, "--target", target], {
      encoding: "utf8",
    });
    return { status, stdout, stderr };
  });

const empty = () => ({ type: "object" });

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const okResponse = (schema: unknown) => ({
  "200": { description: "ok", content: { "application/json": { schema } } },
});

const find = (entries: Entry[], method: string, endpoint: string) => {
  const entry = entries.find((e) => e.method === method && e.path === endpoint);
  assert.ok(entry, `${method} ${endpoint} が出力に無い`);
  return entry;
};

test("各要素が method (大文字)、path、operationId、summary、schemas を持つ", () => {
  const result = runSearch({
    openapi: "3.1.0",
    paths: {
      "/users": {
        get: { operationId: "listUsers", summary: "一覧", responses: okResponse(ref("User")) },
      },
    },
    components: { schemas: { User: { type: "object" } } },
  });
  assert.deepEqual(result, [
    {
      method: "GET",
      path: "/users",
      operationId: "listUsers",
      summary: "一覧",
      schemas: ["User"],
    },
  ]);
});

test("直接参照と 3 段以上の推移参照の schema がすべて schemas に入る", () => {
  const result = runSearch({
    openapi: "3.1.0",
    paths: {
      "/a": { get: { operationId: "a", summary: "a", responses: okResponse(ref("A")) } },
    },
    components: {
      schemas: {
        A: { type: "object", properties: { b: ref("B") } },
        B: { type: "object", properties: { c: ref("C") } },
        C: { type: "object", properties: { d: ref("D") } },
        D: { type: "object" },
        Unused: { type: "object" },
      },
    },
  });
  assert.deepEqual(find(result, "GET", "/a").schemas, ["A", "B", "C", "D"]);
});

test("循環参照と自己参照があっても停止し、関係する schema が 1 回ずつ入る", () => {
  const result = runSearch({
    openapi: "3.1.0",
    paths: {
      "/a": { get: { operationId: "a", summary: "a", responses: okResponse(ref("A")) } },
      "/s": { get: { operationId: "s", summary: "s", responses: okResponse(ref("Self")) } },
    },
    components: {
      schemas: {
        A: { type: "object", properties: { b: ref("B") } },
        B: { type: "object", properties: { a: ref("A") } },
        Self: { type: "object", properties: { child: ref("Self") } },
      },
    },
  });
  assert.deepEqual(find(result, "GET", "/a").schemas, ["A", "B"]);
  assert.deepEqual(find(result, "GET", "/s").schemas, ["Self"]);
});

test("path item 直下の parameters が参照する schema は、その path の全 operation に入り他の path には入らない", () => {
  const result = runSearch({
    openapi: "3.1.0",
    paths: {
      "/items/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: ref("ItemId") }],
        get: { operationId: "getItem", summary: "取得", responses: okResponse(ref("Item")) },
        delete: {
          operationId: "deleteItem",
          summary: "削除",
          responses: { "204": { description: "ok" } },
        },
      },
      "/other": {
        get: { operationId: "other", summary: "他", responses: okResponse(ref("Item")) },
      },
    },
    components: {
      schemas: { ItemId: { type: "string" }, Item: { type: "object" } },
    },
  });
  assert.deepEqual(find(result, "GET", "/items/{id}").schemas, ["Item", "ItemId"]);
  assert.deepEqual(find(result, "DELETE", "/items/{id}").schemas, ["ItemId"]);
  assert.deepEqual(find(result, "GET", "/other").schemas, ["Item"]);
});

test("schema 内部を指す参照では所有 schema が schemas に入る", () => {
  const result = runSearch({
    openapi: "3.1.0",
    paths: {
      "/u": {
        get: {
          operationId: "u",
          summary: "u",
          responses: okResponse({ $ref: "#/components/schemas/User/properties/status" }),
        },
      },
    },
    components: {
      schemas: {
        User: { type: "object", properties: { status: { type: "string" } } },
      },
    },
  });
  assert.deepEqual(find(result, "GET", "/u").schemas, ["User"]);
});

test("parameters や responses を経由した先の schema が入り、経由した名前は入らない", () => {
  const result = runSearch({
    openapi: "3.1.0",
    paths: {
      "/v": {
        get: {
          operationId: "v",
          summary: "v",
          parameters: [{ $ref: "#/components/parameters/Limit" }],
          responses: { "200": { $ref: "#/components/responses/Done" } },
        },
      },
    },
    components: {
      parameters: { Limit: { name: "limit", in: "query", schema: ref("LimitValue") } },
      responses: {
        Done: {
          description: "ok",
          content: { "application/json": { schema: ref("Result") } },
        },
      },
      schemas: { LimitValue: { type: "integer" }, Result: { type: "object" } },
    },
  });
  const schemas = find(result, "GET", "/v").schemas;
  assert.deepEqual(schemas, ["LimitValue", "Result"]);
  assert.equal(schemas.includes("Limit"), false);
  assert.equal(schemas.includes("Done"), false);
});

test("path item の HTTP メソッド以外のキーは operation として出力されない", () => {
  const result = runSearch({
    openapi: "3.1.0",
    paths: {
      "/p": {
        summary: "path の概要",
        description: "path の説明",
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        post: { operationId: "p", summary: "p", responses: { "200": { description: "ok" } } },
      },
    },
  });
  assert.deepEqual(
    result.map((e) => [e.method, e.path]),
    [["POST", "/p"]],
  );
});

test("配列が path、method の順に並び、各 schemas は名前順で重複が無い", () => {
  const op = (id: string, schemas: string[]) => ({
    operationId: id,
    summary: id,
    responses: okResponse({ oneOf: schemas.map(ref) }),
  });
  const result = runSearch({
    openapi: "3.1.0",
    paths: {
      "/b": { post: op("bPost", ["Z", "A"]), get: op("bGet", ["A"]) },
      "/a": { put: op("aPut", ["M", "B", "M/properties/x", "A"]), delete: op("aDelete", ["A"]) },
    },
    components: {
      schemas: {
        A: empty(),
        B: empty(),
        M: { type: "object", properties: { x: { type: "string" } } },
        Z: empty(),
      },
    },
  });
  assert.deepEqual(
    result.map((e) => `${e.method} ${e.path}`),
    ["DELETE /a", "PUT /a", "GET /b", "POST /b"],
  );
  assert.deepEqual(find(result, "PUT", "/a").schemas, ["A", "B", "M"]);
  assert.deepEqual(find(result, "POST", "/b").schemas, ["A", "Z"]);
});

test("解決できない $ref と #/ で始まらない $ref があると、標準エラーに出して 0 以外で終わる", () => {
  const { status, stdout, stderr } = runSearchRaw({
    openapi: "3.1.0",
    paths: {
      "/m": {
        get: {
          operationId: "m",
          summary: "m",
          responses: okResponse({
            allOf: [
              ref("Missing"),
              { $ref: "#/components/schemas/Present" },
              { $ref: "./external.yaml#/Foo" },
            ],
          }),
        },
      },
    },
    components: { schemas: { Present: { type: "object" } } },
  });
  assert.notEqual(status, 0);
  assert.equal(stdout, "");
  assert.ok(stderr.includes("#/components/schemas/Missing"));
  assert.ok(stderr.includes("./external.yaml#/Foo"));
});

const getOp = (operationId: string, schema?: unknown) => ({
  operationId,
  summary: operationId,
  responses: schema ? okResponse(schema) : { "200": { description: "ok" } },
});

const specWith = (paths: unknown, schemas: Record<string, unknown>, extra: object = {}) => ({
  openapi: "3.1.0",
  paths,
  components: { schemas, ...extra },
});

test("path item が components.pathItems への $ref でも、エンドポイントと参照先の schema が出る", () => {
  const result = runSearch(
    specWith(
      { "/b": { $ref: "#/components/pathItems/B" } },
      { Bs: empty() },
      {
        pathItems: { B: { get: getOp("getB", ref("Bs")) } },
      },
    ),
  );
  assert.deepEqual(find(result, "GET", "/b").schemas, ["Bs"]);
  assert.equal(find(result, "GET", "/b").operationId, "getB");
});

test("path item の $ref の連鎖 (A から B) を辿る", () => {
  const result = runSearch(
    specWith(
      { "/a": { $ref: "#/components/pathItems/A" } },
      { S: empty() },
      {
        pathItems: {
          A: { $ref: "#/components/pathItems/B" },
          B: { get: getOp("getB", ref("S")) },
        },
      },
    ),
  );
  assert.deepEqual(find(result, "GET", "/a").schemas, ["S"]);
});

test("path item が $ref と並べて operation を持つと、両方の operation が出る", () => {
  const result = runSearch(
    specWith(
      { "/c": { $ref: "#/components/pathItems/C", post: getOp("postC") } },
      {},
      {
        pathItems: { C: { get: getOp("getC") } },
      },
    ),
  );
  assert.deepEqual(
    result.map((e) => `${e.method} ${e.path}`),
    ["GET /c", "POST /c"],
  );
});

test("キー a~1b を #/components/schemas/a~1b で参照すると、名前は a~1b で先の schema も入る", () => {
  const result = runSearch(
    specWith(
      { "/t": { get: getOp("t", { $ref: "#/components/schemas/a~1b" }) } },
      { "a~1b": { type: "object", properties: { leaf: ref("Leaf") } }, Leaf: empty() },
    ),
  );
  assert.deepEqual(find(result, "GET", "/t").schemas, ["Leaf", "a~1b"]);
});

test("そのままのキーが無ければ ~1 と ~0 を戻して引く", () => {
  const result = runSearch(
    specWith(
      {
        "/s": {
          get: getOp("s", {
            allOf: [{ $ref: "#/components/schemas/a~1b" }, { $ref: "#/components/schemas/c~0d" }],
          }),
        },
      },
      { "a/b": empty(), "c~d": empty() },
    ),
  );
  assert.deepEqual(find(result, "GET", "/s").schemas, ["a/b", "c~d"]);
});

test("キー a~1b と a/b が両方あると、#/components/schemas/a~1b は a~1b を指す", () => {
  const result = runSearch(
    specWith(
      { "/t": { get: getOp("t", { $ref: "#/components/schemas/a~1b" }) } },
      { "a~1b": empty(), "a/b": empty() },
    ),
  );
  assert.deepEqual(find(result, "GET", "/t").schemas, ["a~1b"]);
});

test("percent-encode された $ref は解決できず、0 以外で終わる", () => {
  const { status, stdout, stderr } = runSearchRaw(
    specWith(
      { "/p": { get: getOp("p", { $ref: "#/components/schemas/Foo%20Bar" }) } },
      { "Foo Bar": empty() },
    ),
  );
  assert.notEqual(status, 0);
  assert.equal(stdout, "");
  assert.ok(stderr.includes("#/components/schemas/Foo%20Bar"));
});

test("percent を含むキーはそのまま引ける (percent-decode しない)", () => {
  const result = runSearch(
    specWith(
      { "/p": { get: getOp("p", { $ref: "#/components/schemas/Lit%20X" }) } },
      { "Lit%20X": empty() },
    ),
  );
  assert.deepEqual(find(result, "GET", "/p").schemas, ["Lit%20X"]);
});

test("path item の $ref が解決できない、または循環すると、0 以外で終わる", () => {
  const missing = runSearchRaw(
    specWith({ "/x": { $ref: "#/components/pathItems/Nope" } }, {}, { pathItems: {} }),
  );
  assert.notEqual(missing.status, 0);
  assert.equal(missing.stdout, "");
  assert.ok(missing.stderr.includes("#/components/pathItems/Nope"));

  const loop = runSearchRaw(
    specWith(
      { "/y": { $ref: "#/components/pathItems/L1" } },
      {},
      {
        pathItems: {
          L1: { $ref: "#/components/pathItems/L2" },
          L2: { $ref: "#/components/pathItems/L1" },
        },
      },
    ),
  );
  assert.notEqual(loop.status, 0);
  assert.equal(loop.stdout, "");
  assert.ok(loop.stderr.includes("#/components/pathItems/L1"));
});

test("path item の $ref が path item として使えない値 (配列、null、文字列) を指すと、標準エラーに出して 0 以外で終わる", () => {
  const cases: { ref: string; extra: Record<string, unknown> }[] = [
    { ref: "#/tags", extra: { tags: [{ name: "t" }] } },
    { ref: "#/x-null", extra: { "x-null": null } },
    { ref: "#/info/title", extra: { info: { title: "t", version: "1" } } },
  ];
  for (const { ref, extra } of cases) {
    const { status, stdout, stderr } = runSearchRaw({
      ...specWith({ "/x": { $ref: ref } }, {}),
      ...extra,
    });
    assert.notEqual(status, 0, ref);
    assert.equal(stdout, "", ref);
    assert.ok(stderr.includes(ref), ref);
  }
});
