import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { Location, Source } from "@redocly/openapi-core";

import { NoUnreferencedFiles } from "./no-unreferenced-files.ts";

type Report = { message: string; pointer: string };

/** ref ごとに ref.leave を呼んだ後 Root.leave を呼び、報告を集める。 */
const run = (
  files: Record<string, string>,
  refs: { from?: string; $ref: string; end?: string }[],
  dirs?: string[],
): Report[] => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "no-unreferenced-files-"));
  try {
    for (const [name, body] of Object.entries(files)) {
      const file = path.join(base, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, body);
    }
    const rootPath = path.join(base, "api.yaml");
    fs.writeFileSync(rootPath, "openapi: 3.1.0\n");

    const reports: Report[] = [];
    const rule = NoUnreferencedFiles(dirs === undefined ? {} : { dirs }) as any;

    for (const r of refs) {
      const source = new Source(path.join(base, r.from ?? "api.yaml"), "");
      const location = new Location(source, "#/");
      const resolve = () => ({
        location: r.end ? new Location(new Source(path.join(base, r.end), ""), "#/") : undefined,
      });
      rule.ref.leave({ $ref: r.$ref }, { location, resolve });
    }

    const rootLocation = new Location(new Source(rootPath, ""), "#/");
    rule.Root.leave(
      {},
      {
        location: rootLocation,
        report: (v: { message: string; location: Location }) =>
          reports.push({ message: v.message, pointer: v.location.pointer }),
      },
    );
    return reports;
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
};

const dirs = ["components/schemas"];

test("参照されていないファイルを報告する", () => {
  const reports = run({ "components/schemas/X.yaml": "type: string\n" }, [], dirs);
  assert.equal(reports.length, 1);
  assert.equal(reports[0]!.pointer, "#/components~1schemas~1X.yaml");
  assert.match(reports[0]!.message, /components\/schemas\/X\.yaml/);
});

test("直接参照されているファイルは報告しない", () => {
  const reports = run(
    { "components/schemas/X.yaml": "type: string\n" },
    [{ $ref: "./components/schemas/X.yaml", end: "components/schemas/X.yaml" }],
    dirs,
  );
  assert.deepEqual(reports, []);
});

test("別名ファイルは $ref の文字列と連鎖の終点の両方を参照とみなす", () => {
  const reports = run(
    {
      "components/schemas/Alias.yaml": "$ref: ./Real.yaml\n",
      "components/schemas/Real.yaml": "type: string\n",
    },
    [{ $ref: "./components/schemas/Alias.yaml", end: "components/schemas/Real.yaml" }],
    dirs,
  );
  assert.deepEqual(reports, []);
});

test("サブディレクトリのファイルは相対パスで報告する", () => {
  const reports = run({ "components/schemas/descriptions/x.md": "text\n" }, [], dirs);
  assert.equal(reports.length, 1);
  assert.equal(reports[0]!.pointer, "#/components~1schemas~1descriptions~1x.md");
  assert.match(reports[0]!.message, /components\/schemas\/descriptions\/x\.md/);
});

test("内部参照 (#/...) は何も参照済みにしない", () => {
  const reports = run(
    { "components/schemas/X.yaml": "type: string\n" },
    [{ $ref: "#/components/schemas/Y" }],
    dirs,
  );
  assert.equal(reports.length, 1);
});

test("参照元ファイルからの相対パスで解決する", () => {
  const reports = run(
    {
      "components/schemas/A.yaml": "type: string\n",
      "components/schemas/B.yaml": "type: string\n",
    },
    [{ from: "components/schemas/B.yaml", $ref: "./A.yaml" }],
    dirs,
  );
  assert.deepEqual(
    reports.map((v) => v.pointer),
    ["#/components~1schemas~1B.yaml"],
  );
});

test("別名ファイルが多段でも途中の別名ファイルを報告しない", () => {
  const reports = run(
    {
      "components/schemas/Alias1.yaml": "$ref: ./Alias2.yaml\n",
      "components/schemas/Alias2.yaml": "$ref: ./Target.yaml\n",
      "components/schemas/Target.yaml": "type: string\n",
    },
    [{ $ref: "./components/schemas/Alias1.yaml", end: "components/schemas/Target.yaml" }],
    dirs,
  );
  assert.deepEqual(reports, []);
});

test("別名ファイルが循環していても止まる", () => {
  const reports = run(
    {
      "components/schemas/A.yaml": "$ref: ./B.yaml\n",
      "components/schemas/B.yaml": "$ref: ./A.yaml\n",
    },
    [{ $ref: "./components/schemas/A.yaml" }],
    dirs,
  );
  assert.deepEqual(reports, []);
});

test("名前が . で始まるファイルとディレクトリは対象にしない", () => {
  const reports = run(
    {
      "components/schemas/.gitkeep": "",
      "components/schemas/.hidden/x.yaml": "type: string\n",
    },
    [],
    dirs,
  );
  assert.deepEqual(reports, []);
});

test("存在しないディレクトリは報告し、例外にはしない", () => {
  const reports = run({}, [], ["no/such/dir"]);
  assert.deepEqual(reports, [
    { message: "検査対象のディレクトリがありません (no/such/dir)。", pointer: "#/no~1such~1dir" },
  ]);
});

test("dirs 未指定なら何も検査せず報告しない", () => {
  assert.deepEqual(run({ "components/schemas/X.yaml": "" }, []), []);
});
