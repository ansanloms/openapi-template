import { readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import * as yaml from "yaml";
import type { OpenAPIV3_1 } from "openapi-types";

const API_DOC_PATH = path.join(import.meta.dirname, "../api.yaml");
const SCHEMA_PREFIXES = ["Enum", "Request", "Response"];

const sortKeys = <T>(source: Record<string, T>, compare?: (a: string, b: string) => number) =>
  Object.fromEntries(
    Object.keys(source)
      .sort(compare)
      .map((key) => [key, source[key]]),
  );

const weight = (name: string) =>
  `${SCHEMA_PREFIXES.findIndex((prefix) => name.startsWith(prefix)) + 1}${name}`;

const apiDoc = yaml.parse(await readFile(API_DOC_PATH, "utf8")) as OpenAPIV3_1.Document;
const { components } = apiDoc;

if (apiDoc.paths) {
  apiDoc.paths = sortKeys(apiDoc.paths);
}
if (components?.schemas) {
  components.schemas = sortKeys(components.schemas, (a, b) => weight(a).localeCompare(weight(b)));
}
if (components?.securitySchemes) {
  components.securitySchemes = sortKeys(components.securitySchemes);
}

await writeFile(API_DOC_PATH, yaml.stringify(apiDoc, { lineWidth: -1 }));
