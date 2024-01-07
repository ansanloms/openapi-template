import { cli } from "textlint";

import _1 from "textlint-filter-rule-comments";
import _2 from "textlint-rule-preset-ja-spacing";
import _3 from "textlint-rule-preset-ja-technical-writing";
import _4 from "textlint-rule-spellcheck-tech-word";

const result = await cli.execute(Deno.args.join(" "));

if (result !== 0 && Deno.args.some((v) => v.trim() === "--fix")) {
  await cli.execute(Deno.args.filter((v) => v.trim() !== "--fix").join(" "));
}

Deno.exit(result);
