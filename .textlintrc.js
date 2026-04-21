module.exports = {
  rules: {
    // https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing
    "preset-ja-technical-writing": {
      // 文の長さ。
      "sentence-length": {
        max: 600,
      },

      // 連続できる最大の漢字長。
      "max-kanji-continuous-len": {
        max: 15,
      },

      // 敬体と常体の設定。
      "no-mix-dearu-desumasu": {
        // 本文(Body)。
        preferInBody: "である",

        // 見出し(Header)。
        preferInHeader: "である",

        // 箇条書き(List)。
        preferInList: "である",

        // 文末以外でも敬体(ですます調)と常体(である調)を厳しくチェックするかどうか。
        strict: true,
      },

      // 弱い表現を許可するかどうか。
      "ja-no-weak-phrase": false,

      // 助詞の連続をの設定。
      // 「かどうか」とかあるし文章伝わる割と対応しんどいので一旦無効で。
      "no-doubled-joshi": false,
    },

    // https://github.com/textlint-ja/textlint-rule-preset-ja-spacing
    "preset-ja-spacing": {
      // 全角半角間にスペースを空ける。
      "ja-space-between-half-and-full-width": {
        space: "always",
      },
    },

    // https://github.com/textlint-ja/textlint-rule-preset-JTF-style
    "preset-jtf-style": {
      "1.1.3.箇条書き": false,
      "2.1.5.カタカナ": true,
      "3.1.1.全角文字と半角文字の間": false,
      "4.2.6.ハイフン(-)": false,
      "4.2.7.コロン(：)": false,
      "4.3.1.丸かっこ（）": false,
      "4.3.2.大かっこ［］": false,
      "4.3.7.山かっこ<>": false,
    },

    // https://github.com/proofdict/proofdict/tree/master/packages/@proofdict/textlint-rule-proofdict
    "@proofdict/proofdict": {
      dicts: [
        {
          dictURL: "https://azu.github.io/proof-dictionary/",
          autoUpdateInterval: 1000,
        },
        {
          dictGlob: "./dict/*.yaml",
        },
      ],
    },

    // https://github.com/textlint-ja/textlint-rule-preset-ai-writing
    "@textlint-ja/preset-ai-writing": {
      "ai-tech-writing-guideline": {
        "severity": "info",
      },
    },
  },
};
