# openapi-template

OpenAPI Example.

## 開発

- `.node-version` に書かれたバージョンの Node が必要。
- `npm ci`: 依存を入れる。
- `npm run lint`: 型検査、oxlint と oxfmt、textlint、redocly lint を順に実行する。
- `npm run fix`: sort と textlint、oxlint、oxfmt の各 fixer を順に実行して最後に lint する (途中で失敗しても続行)。
- `npm run build`: `dist/` に静的サイト (`index.html`、`assets/` 配下の JS・CSS、`api.yaml`、同梱した依存のライセンス一覧 `licenses.md`) を出力する。
- `npm run dev`: Vite の dev サーバを `http://localhost:4000` で起動する。spec の bundle は起動時に Vite が行い、spec 関連のファイルを編集するとブラウザが再読み込みされる。
- `npm run list`: エンドポイント一覧を出力する (`-- --format json` で JSON)。
- `npm run search -- --schema <name>`: schema を利用しているエンドポイントを出力する。

依存は `.npmrc` により正確な版で固定する。自前の 2 パッケージ (textlint-plugin-yaml-keys、redocly-plugin-inline-examples) は GitHub のタグを git 依存で参照しており、Dependabot が更新しないため `package.json` のタグを手で書き換えて `npm install` する。
