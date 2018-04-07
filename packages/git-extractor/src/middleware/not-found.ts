import { Context } from "koa";

// Not found handler
const notFound = async (ctx: Context, next: () => Promise<any>) => {
  await next();

  if (ctx.status === 404) {
    ctx.body = { error: "Page not found" };
  }
};

export default notFound;
