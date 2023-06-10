import { serve } from "std/http/server.ts";
import { Command } from "cliffy/command/mod.ts";
import { Status, STATUS_TEXT } from "std/http/http_status.ts";
import { contentType } from "std/media_types/mod.ts";
import { dirname, extname, fromFileUrl, join } from "std/path/mod.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const { options } = await new Command()
  .name("server")
  .option("-p --port [port:number]", "Port.")
  .option("--base-path [basePath:string]", "Base path.")
  .parse();

serve(
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
        return new Response(STATUS_TEXT[Status.NotFound], {
          status: Status.NotFound,
          statusText: STATUS_TEXT[Status.NotFound],
        });
      } else {
        return new Response(STATUS_TEXT[Status.InternalServerError], {
          status: Status.InternalServerError,
          statusText: STATUS_TEXT[Status.InternalServerError],
        });
      }
    }
  },
  { port: Number(options.port) },
);
