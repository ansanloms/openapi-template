# openapi-template

OpenAPI Example.

## 開発

- `.node-version` に書かれたバージョンの Node が必要。
- `npm ci`: 依存を入れる。
- `npm run lint`: 型検査、oxlint と oxfmt、textlint、redocly lint を順に実行する。
- `npm test`: `bin/` 配下のスクリプトのテストを実行する。
- `npm run fix`: sort と textlint、oxlint、oxfmt の各 fixer を順に実行して最後に lint する (途中で失敗しても続行)。
- `npm run build`: `dist/` に `index.html` (Redoc の JS を埋め込んだ単一の HTML) と `api.yaml` を出力する。
- `npm run dev`: Vite の dev サーバを `http://localhost:4000` で起動する。dev サーバは spec を `redocly build-docs` で HTML にして返す。spec のファイルを編集すると HTML が作り直され、ブラウザが再読み込みされる。

依存は `.npmrc` により正確な版で固定する。自前の 2 パッケージ (textlint-plugin-yaml-keys、redocly-plugins) は GitHub のタグを git 依存で参照しており、Dependabot が更新しないため `package.json` のタグを手で書き換えて `npm install` する。
