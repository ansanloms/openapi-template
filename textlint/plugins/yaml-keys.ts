// textlint plugin yaml-keys (ansanloms/textlint-plugin-yaml-keys) のローカルラッパー。
//
// textlint の plugin ローダは Node の require で動くため URL や import map の
// specifier を直接は解決できないが、ローカルの ESM ファイルは絶対パスで
// 読み込める。このファイル内の import は Deno の import map (deno.json の
// "@ansanloms/textlint-plugin-yaml-keys") 経由で jsDelivr が配信する
// bundle 済みの dist/index.js へ解決される。
import plugin from "@ansanloms/textlint-plugin-yaml-keys";

export default plugin;
