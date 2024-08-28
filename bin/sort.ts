import * as yaml from "@std/yaml";
import * as path from "@std/path";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

const API_DOC_PATH = path.join(__dirname, "./../api.yaml");

const main = async () => {
  const apiDoc = yaml.parse(await Deno.readTextFile(API_DOC_PATH));

  apiDoc.paths = Object.keys(apiDoc.paths)
    .sort()
    .reduce((obj, key) => {
      obj[key] = apiDoc.paths[key];
      return obj;
    }, {});

  apiDoc.components.schemas = Object.keys(apiDoc.components.schemas)
    .map((v) => {
      if (v.startsWith("Enum")) {
        return `1${v}`;
      } else if (v.startsWith("Request")) {
        return `2${v}`;
      } else if (v.startsWith("Response")) {
        return `3${v}`;
      } else {
        return `0${v}`;
      }
    })
    .sort()
    .map((v) => v.slice(1))
    .reduce((obj, key) => {
      obj[key] = apiDoc.components.schemas[key];
      return obj;
    }, {});

  if (apiDoc.components.securitySchemes) {
    apiDoc.components.securitySchemes = Object.keys(
      apiDoc.components.securitySchemes,
    )
      .sort()
      .reduce((obj, key) => {
        obj[key] = apiDoc.components.securitySchemes[key];
        return obj;
      }, {});
  }

  await Deno.writeTextFile(
    API_DOC_PATH,
    yaml.stringify(apiDoc, { lineWidth: -1, quotingType: '"' }),
  );
};

main()
  .then(() => {
    Deno.exit(0);
  })
  .catch((err) => {
    console.error(err);
    Deno.exit(1);
  });
