import { DescriptionFileNaming } from "./rules/description-file-naming.ts";
import {
  createOperationIdNaming,
  type ExpectedOperationId,
  expectedOperationId,
} from "./rules/operation-id-naming.ts";

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
