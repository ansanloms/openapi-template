import { createPlugin } from "./plugin.ts";
import { expectedOperationId } from "./rules/operation-id-naming.ts";

// operationId の命名規約を差し替える場合は、ここで渡す関数を変える。
export default createPlugin({ id: "local", operationId: expectedOperationId });
