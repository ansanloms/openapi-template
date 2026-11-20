import { readFileSync } from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";
import * as yaml from "yaml";

const methods = ["get", "put", "post", "delete", "options", "head", "patch", "trace", "query"];

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const { values } = parseArgs({
  options: {
    target: { type: "string", default: path.join(import.meta.dirname, "../dist/api.yaml") },
  },
});

const spec = yaml.parse(readFileSync(values.target, "utf8")) as Record<string, any>;

// 値がデータ (schema でも Reference Object でもない) のキー。中の $ref は参照として扱わない。
const dataKeys = new Set(["example", "default", "enum", "const"]);

// 子のキーが名前 (プロパティ名、ステータスコード等) の map。直下のキーはキーワードとして解釈しない。
const nameMaps = new Set([
  "properties",
  "patternProperties",
  "$defs",
  "dependentSchemas",
  "responses",
  "headers",
  "content",
  "callbacks",
  "links",
  "encoding",
]);

// Example Object の value と dataValue はデータなので外す。
const withoutExampleData = (obj: unknown) => {
  const { value: _value, dataValue: _dataValue, ...rest } = obj as Record<string, unknown>;
  return rest;
};

const getRefs = (obj: unknown): string[] =>
  Object.entries(obj ?? {}).flatMap(([k, v]) => {
    if (k === "$ref" && typeof v === "string") {
      return [v];
    }
    if (!v || typeof v !== "object" || dataKeys.has(k)) {
      return [];
    }
    // examples は配列なら schema の examples (データ)、そうでなければ Example Object の map。
    if (k === "examples") {
      return Array.isArray(v)
        ? []
        : Object.values(v).flatMap((e) =>
            e && typeof e === "object" ? getRefs(withoutExampleData(e)) : [],
          );
    }
    if (nameMaps.has(k) && !Array.isArray(v)) {
      return Object.values(v).flatMap((child) => getRefs(child));
    }
    return getRefs(v);
  });

// $ref を JSON Pointer のセグメント配列に直す。エスケープの復元は resolve が行う。
const toSegments = (ref: string) => ref.slice(2).split("/");

// 辿れなかった $ref (解決できないもの、#/ で始まらないもの)。
const unresolved = new Set<string>();

// bundle 済み文書のルートから引く。そのままのキーを先に試し、無ければ ~1・~0 を戻して試す。
const resolve = (ref: string): { node: unknown; keys: string[] } | undefined => {
  let node: unknown = spec;
  const keys: string[] = [];
  for (const seg of toSegments(ref)) {
    if (node === null || typeof node !== "object") {
      return undefined;
    }
    const key = [seg, seg.replaceAll("~1", "/").replaceAll("~0", "~")].find((k) =>
      Object.hasOwn(node as object, k),
    );
    if (key === undefined) {
      return undefined;
    }
    keys.push(key);
    node = (node as Record<string, unknown>)[key];
  }
  return { node, keys };
};

// $ref を推移的に辿り、到達した components.schemas の名前を返す。訪問済み集合で循環を止める。
const collect = (obj: unknown) => {
  const seen = new Set<string>();
  const names = new Set<string>();
  const walk = (node: unknown) => {
    for (const ref of getRefs(node)) {
      if (seen.has(ref)) {
        continue;
      }
      seen.add(ref);
      if (!ref.startsWith("#/")) {
        unresolved.add(ref);
        continue;
      }
      const resolved = resolve(ref);
      if (resolved === undefined) {
        unresolved.add(ref);
        continue;
      }
      const { node: target, keys } = resolved;
      if (keys[0] === "components" && keys[1] === "schemas" && keys.length >= 3) {
        names.add(keys[2]);
      }
      // redocly は $ref で取り込んだ Example を components.examples へ寄せるので、ここでも value と dataValue を外す。
      const isExample = keys.length === 3 && keys[0] === "components" && keys[1] === "examples";
      walk(isExample && target && typeof target === "object" ? withoutExampleData(target) : target);
    }
  };
  walk(obj);
  return [...names].sort();
};

const isPlainObject = (v: unknown): v is Record<string, any> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

// path item の $ref を連鎖も含めて辿り、$ref 以外のキーを参照元優先で合わせる。辿れなければ undefined。
// additionalOperations だけは 1 階層合成し、同じキーは参照元を優先する。
const resolvePathItem = (item: Record<string, any>): Record<string, any> | undefined => {
  const visited = new Set<string>();
  let merged: Record<string, any> = {};
  let current: Record<string, any> = item;
  while (true) {
    const { $ref, ...rest } = current;
    const { additionalOperations: ops, ...others } = rest;
    merged = { ...others, ...merged };
    if (isPlainObject(ops)) {
      merged.additionalOperations = { ...ops, ...merged.additionalOperations };
    }
    if (typeof $ref !== "string") {
      return merged;
    }
    if (!$ref.startsWith("#/") || visited.has($ref)) {
      unresolved.add($ref);
      return undefined;
    }
    visited.add($ref);
    const resolved = resolve($ref);
    if (
      resolved === undefined ||
      resolved.node === null ||
      typeof resolved.node !== "object" ||
      Array.isArray(resolved.node)
    ) {
      unresolved.add($ref);
      return undefined;
    }
    current = resolved.node as Record<string, any>;
  }
};

const result = Object.entries<any>(spec.paths ?? {}).flatMap(([endpoint, rawItem]) => {
  const item = resolvePathItem(rawItem);
  if (item === undefined) {
    return [];
  }
  const operations: [string, any][] = [
    ...Object.entries<any>(item)
      .filter(([method]) => methods.includes(method))
      .map(([method, operation]): [string, any] => [method.toUpperCase(), operation]),
    ...(isPlainObject(item.additionalOperations)
      ? Object.entries<any>(item.additionalOperations)
      : []),
  ];
  return operations.map(([method, operation]) => ({
    method,
    path: endpoint,
    operationId: operation.operationId,
    summary: operation.summary,
    schemas: collect([item.parameters, operation]),
  }));
});

result.sort((a, b) => cmp(a.path, b.path) || cmp(a.method, b.method));

if (unresolved.size === 0) {
  console.info(JSON.stringify(result, null, 2));
} else {
  for (const ref of unresolved) {
    console.error(`解決できない $ref: ${ref}`);
  }
  process.exitCode = 1;
}
