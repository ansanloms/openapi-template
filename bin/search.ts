import { readFileSync } from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";
import * as yaml from "yaml";

const methods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const { values } = parseArgs({
  options: {
    target: { type: "string", default: path.join(import.meta.dirname, "../dist/api.yaml") },
  },
});

const spec = yaml.parse(readFileSync(values.target, "utf8")) as Record<string, any>;

const getRefs = (obj: unknown): string[] =>
  Object.entries(obj ?? {}).flatMap(([k, v]) =>
    k === "$ref" && typeof v === "string" ? [v] : v && typeof v === "object" ? getRefs(v) : [],
  );

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
      walk(target);
    }
  };
  walk(obj);
  return [...names].sort();
};

// path item の $ref を連鎖も含めて辿り、$ref 以外のキーを参照元優先で合わせる。辿れなければ undefined。
const resolvePathItem = (item: Record<string, any>): Record<string, any> | undefined => {
  const visited = new Set<string>();
  let merged: Record<string, any> = {};
  let current: Record<string, any> = item;
  while (true) {
    const { $ref, ...rest } = current;
    merged = { ...rest, ...merged };
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
  return Object.entries<any>(item)
    .filter(([method]) => methods.includes(method))
    .map(([method, operation]) => ({
      method: method.toUpperCase(),
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
