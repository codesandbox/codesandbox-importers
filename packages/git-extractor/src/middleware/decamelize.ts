import { Context } from "koa";
import { decamelizeKeys } from "humps";

const decamelizeMiddleware = async (ctx: Context, next: () => Promise<any>) => {
  await next();

  ctx.body = decamelizeKeys(ctx.body as object[]);
};

export default decamelizeMiddleware;
