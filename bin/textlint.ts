import { cli } from "textlint";

import _1 from "@proofdict/textlint-rule-proofdict";
import _2 from "textlint-filter-rule-comments";
import _3 from "textlint-rule-preset-ja-spacing";
import _4 from "textlint-rule-preset-ja-technical-writing";
import _5 from "textlint-filter-rule-allowlist";

const code = await cli.execute(Deno.args.join(" "));

if (Deno.args.includes("--fix")) {
  const lintCode = await cli.execute(
    Deno.args.filter((arg) => arg !== "--fix").join(" "),
  );
  Deno.exit(code || lintCode);
} else {
  Deno.exit(code);
}
