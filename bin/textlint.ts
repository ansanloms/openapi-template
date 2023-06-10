import { cli } from "npm:textlint";
import "../textlint-rules.ts";

const result = await cli.execute(Deno.args.join(" "));

if (result !== 0 && Deno.args.some((v) => v.trim() === "--fix")) {
  await cli.execute(Deno.args.filter((v) => v.trim() !== "--fix").join(" "));
}

Deno.exit(result);
