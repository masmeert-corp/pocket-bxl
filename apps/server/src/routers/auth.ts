import { auth } from "@pocket-bxl/auth";
import { Hono } from "hono";

export const authRouter = new Hono();

authRouter.on(["POST", "GET"], "/*", (c) => auth.handler(c.req.raw));
