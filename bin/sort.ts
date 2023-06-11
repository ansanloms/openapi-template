import * as yaml from "std/yaml/mod.ts";
import * as path from "std/path/mod.ts";
import { dirname, fromFileUrl } from "std/path/mod.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const API_YAML_PATH = path.join(__dirname, "/../src/api.yaml");

const main = async () => {
  const apiYaml = yaml.parse(await Deno.readTextFile(API_YAML_PATH));

  apiYaml.paths = Object.keys(apiYaml.paths)
    .sort()
    .reduce((obj, key) => {
      obj[key] = apiYaml.paths[key];
      return obj;
    }, {});

  apiYaml.components.schemas = Object.keys(apiYaml.components.schemas)
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
      obj[key] = apiYaml.components.schemas[key];
      return obj;
    }, {});

  if (apiYaml.components.securitySchemes) {
    apiYaml.components.securitySchemes = Object.keys(
      apiYaml.components.securitySchemes,
    )
      .sort()
      .reduce((obj, key) => {
        obj[key] = apiYaml.components.securitySchemes[key];
        return obj;
      }, {});
  }

  await Deno.writeTextFile(
    API_YAML_PATH,
    yaml.stringify(apiYaml, { lineWidth: -1, quotingType: '"' }),
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
