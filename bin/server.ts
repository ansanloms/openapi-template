import { Command } from "cliffy/command/mod.ts";
import { STATUS_CODE, STATUS_TEXT } from "std/http/mod.ts";
import { contentType } from "std/media_types/mod.ts";
import { dirname, extname, fromFileUrl, join } from "std/path/mod.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const { options } = await new Command()
  .name("server")
  .option("-p --port [port:number]", "Port.")
  .option("--base-path [basePath:string]", "Base path.")
  .parse();

Deno.serve(
  { port: Number(options.port), hostname: "0.0.0.0" },
  async (request: Request) => {
    try {
      const filename = decodeURIComponent(
        new URL(request.url).pathname === "/"
          ? "/index.html"
          : new URL(request.url).pathname,
      );
      console.log(filename);

      const body = await Deno.readTextFile(
        join(__dirname, "../", String(options.basePath), filename),
      );

      return new Response(body, {
        headers: {
          "Content-Type": `${contentType(extname(filename))}; charset=utf-8`,
          "Cache-Control": "max-age=0",
        },
      });
    } catch (error) {
      console.error(error);

      if (error instanceof Deno.errors.NotFound) {
        return new Response(STATUS_TEXT[STATUS_CODE.NotFound], {
          status: STATUS_CODE.NotFound,
          statusText: STATUS_TEXT[STATUS_CODE.NotFound],
        });
      } else {
        return new Response(STATUS_TEXT[STATUS_CODE.InternalServerError], {
          status: STATUS_CODE.InternalServerError,
          statusText: STATUS_TEXT[STATUS_CODE.InternalServerError],
        });
      }
    }
  },
);
