import assert from "node:assert/strict";
import { test } from "node:test";

import { findExampleLayoutViolations } from "./examples-layout.ts";

const schemas = new Set(["Item", "Content"]);

test("<Schema>/<File>.yaml の配置は違反としない", () => {
  assert.deepEqual(
    findExampleLayoutViolations(["Item/Example.yaml", "Content/A.yaml"], schemas),
    [],
  );
});

test("examples 直下の yaml は違反とする", () => {
  const result = findExampleLayoutViolations(["Item.yaml"], schemas);
  assert.equal(result.length, 1);
  assert.equal(result[0]!.entry, "Item.yaml");
  assert.match(result[0]!.message, /Item\.yaml/);
});

test("深さ 3 以上の yaml は違反とする", () => {
  const result = findExampleLayoutViolations(["Item/sub/Example.yaml"], schemas);
  assert.equal(result.length, 1);
  assert.equal(result[0]!.entry, "Item/sub/Example.yaml");
  assert.match(result[0]!.message, /サブディレクトリ/);
});

test("スキーマ名でないディレクトリの yaml は違反とする", () => {
  const result = findExampleLayoutViolations(["Unknown/Example.yaml"], schemas);
  assert.equal(result.length, 1);
  assert.equal(result[0]!.entry, "Unknown/Example.yaml");
  assert.match(result[0]!.message, /スキーマ名ではありません/);
});

test("深さ 3 以上かつスキーマ名でないディレクトリは両方を報告する", () => {
  const result = findExampleLayoutViolations(["Unknown/sub/Example.yaml"], schemas);
  assert.equal(result.length, 2);
  assert.ok(result.every((v) => v.entry === "Unknown/sub/Example.yaml"));
  assert.ok(result.some((v) => /スキーマ名ではありません/.test(v.message)));
  assert.ok(result.some((v) => /サブディレクトリ/.test(v.message)));
});

test("yaml 以外のファイルは無視する", () => {
  assert.deepEqual(
    findExampleLayoutViolations(["a.pdf", "Unknown/b.pdf", "Item/c/d.pdf"], schemas),
    [],
  );
});

test(".yml も対象とする", () => {
  assert.deepEqual(findExampleLayoutViolations(["Item/Example.yml"], schemas), []);
  assert.equal(findExampleLayoutViolations(["Item.yml", "Unknown/Example.yml"], schemas).length, 2);
});
