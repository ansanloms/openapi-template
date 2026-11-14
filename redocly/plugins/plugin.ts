import { DescriptionFileNaming } from "./rules/description-file-naming.ts";
import { createOperationIdNaming, type ExpectedOperationId } from "./rules/operation-id-naming.ts";

const toPascalCase = (segment: string): string =>
  segment
    .split(/[^A-Za-z0-9]/)
    .filter((v) => v.length > 0)
    .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
    .join("");

/**
 * パスと HTTP メソッドから期待される operationId を算出する。
 *
 * - メソッド(小文字) + 各セグメントの PascalCase 連結。
 * - 各セグメントは英数字以外の文字 (`-`・`_`・`.` 等) で単語に分割し、各単語の
 *   先頭を大文字にして連結する (例: `/sitemap.xml` -> `SitemapXml`)。
 * - `{param}` は波括弧を除去して同様に変換し、常に含める (例: `/code/{code}` -> `CodeCode`)。
 */
export const expectedOperationId: ExpectedOperationId = (method, path) => {
  const parts = path
    .split("/")
    .filter((v) => v.length > 0)
    .map((segment) => toPascalCase(/^\{(.+)\}$/.exec(segment)?.[1] ?? segment));

  return method.toLowerCase() + parts.join("");
};

export interface PluginOptions {
  id: string;
  operationId?: ExpectedOperationId;
}

export const createPlugin = (options: PluginOptions) => () => ({
  id: options.id,
  rules: {
    oas3: {
      "operation-id-naming": createOperationIdNaming(options.operationId ?? expectedOperationId),
      "description-file-naming": DescriptionFileNaming,
    },
  },
});
