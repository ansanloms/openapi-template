import type { Oas3preprocessor } from "@redocly/openapi-core/src/visitors.ts";
import * as path from "@std/path";
import * as yaml from "@std/yaml";

const getYaml = (p: string) => {
  const result = yaml.parse(Deno.readTextFileSync(p));
  return typeof result === "object" && result !== null ? result : {};
};

const bundle = (
  target: Record<string, unknown> | unknown[],
  baseDir: string,
) => {
  let result: Record<string, unknown> | unknown[] = Array.isArray(target)
    ? []
    : {};

  for (const [key, value] of Object.entries(target)) {
    if (
      key === "$ref" && typeof value === "string" &&
      path.extname(value) === ".yaml" && !Array.isArray(target)
    ) {
      const targetPath = path.join(baseDir, value);
      result = {
        ...result,
        ...bundle(getYaml(targetPath), path.dirname(targetPath)),
      };
    } else {
      result[Array.isArray(target) ? Number(key) : key] =
        typeof value === "object" && value !== null
          ? bundle(value, baseDir)
          : value;
    }
  }

  return result;
};

const bundleEntry = (
  target: Record<string, unknown> | unknown[],
  baseDir: string,
) => {
  if (Array.isArray(target)) {
    return target.map((value) => bundleEntry(value, baseDir));
  } else {
    return Object.fromEntries(
      Object.entries(target).map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          return [
            key,
            key === "examples"
              ? bundle(value, baseDir)
              : bundleEntry(value, baseDir),
          ];
        } else {
          return [key, value];
        }
      }),
    );
  }
};

export const BundleExamples: Oas3preprocessor = () => ({
  Operation: {
    leave(target, ctx) {
      const basedir = path.dirname(ctx.location.source.absoluteRef);

      if (target.requestBody) {
        target.requestBody = bundleEntry(
          target.requestBody,
          basedir,
        );
      }

      if (target.responses) {
        target.responses = bundleEntry(
          target.responses,
          basedir,
        );
      }
    },
  },
});
