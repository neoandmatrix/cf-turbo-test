import { Hono } from "hono";
import { notFound } from "stoker/middlewares";
import { z } from "zod";

type Bindings = {
  CACHE: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/:username", async (c) => {
  const username = c.req.param("username");
  const usernameValidation = z.string();
  if (usernameValidation.safeParse(username).success === false) {
    return c.json({ error: "Invalid username" });
  } else {
    const cachedResponse = await c.env.CACHE.get(username, "json");
    if (cachedResponse) {
      return c.json(cachedResponse);
    }
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
  }
});

app.notFound(notFound);

export default app;
