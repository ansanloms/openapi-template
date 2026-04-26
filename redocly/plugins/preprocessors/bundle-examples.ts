import type { Oas3Preprocessor } from "@redocly/openapi-core";
import * as path from "@std/path";
import * as yaml from "yaml";

type YamlContainer = Record<string, unknown> | unknown[];

const isContainer = (value: unknown): value is YamlContainer =>
  typeof value === "object" && value !== null;

const getYaml = (p: string): Record<string, unknown> => {
  const result = yaml.parse(Deno.readTextFileSync(p));
  return typeof result === "object" && result !== null && !Array.isArray(result)
    ? (result as Record<string, unknown>)
    : {};
};

const bundle = (target: YamlContainer, baseDir: string): YamlContainer => {
  if (Array.isArray(target)) {
    return target.map((value) =>
      isContainer(value) ? bundle(value, baseDir) : value
    );
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(target)) {
    if (
      key === "$ref" && typeof value === "string" &&
      path.extname(value) === ".yaml"
    ) {
      const targetPath = path.join(baseDir, value);
      Object.assign(
        result,
        bundle(getYaml(targetPath), path.dirname(targetPath)),
      );
    } else {
      result[key] = isContainer(value) ? bundle(value, baseDir) : value;
    }
  }
  return result;
};

const bundleEntry = (target: YamlContainer, baseDir: string): YamlContainer => {
  if (Array.isArray(target)) {
    return target.map((value) =>
      isContainer(value) ? bundleEntry(value, baseDir) : value
    );
  }

  return Object.fromEntries(
    Object.entries(target).map(([key, value]) => {
      if (isContainer(value)) {
        return [
          key,
          key === "examples"
            ? bundle(value, baseDir)
            : bundleEntry(value, baseDir),
        ];
      }
      return [key, value];
    }),
  );
};

export const BundleExamples: Oas3Preprocessor = () => ({
  Operation: {
    leave(target, ctx) {
      const basedir = path.dirname(ctx.location.source.absoluteRef);

      if (target.requestBody && isContainer(target.requestBody)) {
        target.requestBody = bundleEntry(
          target.requestBody as YamlContainer,
          basedir,
        ) as typeof target.requestBody;
      }

      if (target.responses && isContainer(target.responses)) {
        target.responses = bundleEntry(
          target.responses as YamlContainer,
          basedir,
        ) as typeof target.responses;
      }
    },
  },
});
