import type { Oas3PreprocessorSet } from "@redocly/openapi-core/src/oas-types.ts";

import { BundleExamples } from "./preprocessors/bundle-examples.ts";

export const preprocessors: Oas3PreprocessorSet = {
  "bundle-examples": BundleExamples,
};

const plugin = () => ({
  id: "my",
  preprocessors: {
    oas3: preprocessors,
  },
});

export default plugin;
