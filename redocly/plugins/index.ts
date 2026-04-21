import type { Oas3Preprocessor } from "@redocly/openapi-core";

import { BundleExamples } from "./preprocessors/bundle-examples.ts";

export const preprocessors: Record<string, Oas3Preprocessor> = {
  "bundle-examples": BundleExamples,
};

const plugin = () => ({
  id: "my",
  preprocessors: {
    oas3: preprocessors,
  },
});

export default plugin;
