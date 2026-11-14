import { createPlugin } from "./plugin.ts";

// `operationId` を省略すると、`./plugin.ts` の `expectedOperationId` (既定の規約) が使われる。
// operationId の命名規約を差し替える場合は、`operationId` に関数を渡す。
export default createPlugin({ id: "local" });
