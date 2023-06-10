module.exports = {
  filters: {
    comments: true,
  },
  rules: {
    // https://github.com/azu/textlint-rule-spellcheck-tech-word
    "spellcheck-tech-word": true,

    // https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing
    "preset-ja-technical-writing": {
      // 文の長さ。
      "sentence-length": {
        max: 200,
      },

      // 連続できる最大の漢字長。
      "max-kanji-continuous-len": {
        max: 15,
      },

      // https://github.com/textlint-ja/textlint-rule-no-mix-dearu-desumasu
      "no-mix-dearu-desumasu": {
        // 本文(Body)。
        preferInHeader: "である",

        // 見出し(Header)。
        preferInBody: "である",

        // 箇条書き(List)。
        preferInList: "である",

        // 文末以外でも敬体(ですます調)と常体(である調)を厳しくチェックするかどうか。
        strict: true,
      },
    },

    // https://github.com/textlint-ja/textlint-rule-preset-ja-spacing
    "preset-ja-spacing": {
      // 全角半角間にスペースを空ける。
      "ja-space-between-half-and-full-width": {
        space: "always",
      },
    },
  },
};
