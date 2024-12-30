import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { notFound, onError } from "stoker/middlewares";
import { z } from "zod";

type Bindings = {
  CACHE: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();


app.get("/error", (c) => {
  c.status(422);
  throw new Error("This is an error");
})

const usernameValidation = z.string();

app.get("/github/:username",zValidator('param',usernameValidation) ,async (c) => {
  const username = c.req.param("username");
  
  if (usernameValidation.safeParse(username).success === false) {
    console.log({ username });
    return c.json({ error: "Invalid username" });
  } else {
    const cachedResponse = await c.env.CACHE.get(username, "json");
    if (cachedResponse) {
      console.log({ stauts : "success" });
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
  }
});



app.notFound(notFound);

app.onError(onError);

export default app;
