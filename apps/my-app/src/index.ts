import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { notFound, onError } from "stoker/middlewares";
import { z } from "zod";
import { Logger } from "tslog";
import { logger } from 'hono/logger';

type Bindings = {
  CACHE: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(logger())


app.get("/error", (c) => {
  c.status(422);
  throw new Error("This is an error");
})

const usernameValidation = z.object({
  username: z.string().refine((val) => isNaN(Number(val)), {
    message: "Username must be a non-numeric string",
  }),
});

app.get("/github/:username", zValidator('param', usernameValidation), async (c) => {
  const username = c.req.param("username");
  
  const cachedResponse = await c.env.CACHE.get(username, "json");
  if (cachedResponse) {

    console.log("\x1b[31mAUTH_SECRET already exists in .dev.vars\x1b[0m");
    return c.json(cachedResponse);
  }
  console.log({action : "fetching from github"});
  const response = await fetch(
    `https://api.github.com/users/${username}/repos`,
    {
      headers: {
        "User-Agent": "CF-worker",
      },
    }
  );
  const data: any = await response.json();
  await c.env.CACHE.put(username, JSON.stringify(data));
  return c.json(data);
});



app.notFound(notFound);

app.onError(onError);

export default app;
