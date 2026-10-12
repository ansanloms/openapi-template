# openapi-template

OpenAPI Example.

## 開発

- Node 24 (`.node-version`) が必要。
- `npm ci`: 依存を入れる。
- `npm run lint`: 型検査、oxlint と oxfmt、textlint、redocly lint を順に実行する。
- `npm run fix`: sort と textlint、oxlint、oxfmt の各 fixer を順に実行して最後に lint する (途中で失敗しても続行)。
- `npm run build`: `dist/` に静的サイトを出力する。
- `npm run dev`: リポジトリ直下を `http://localhost:4000` で配信する。
- `npm run list`: エンドポイント一覧を出力する (`-- --format json` で JSON)。
- `npm run search -- --schema <name>`: schema を利用しているエンドポイントを出力する。

依存は `.npmrc` により正確な版で固定する。自前の 3 パッケージ (textlint-plugin-yaml-keys、textlint-rule-preset-ansanloms、redocly-plugin-inline-examples) は GitHub のタグを git 依存で参照しており、Dependabot が更新しないため `package.json` のタグを手で書き換えて `npm install` する。
