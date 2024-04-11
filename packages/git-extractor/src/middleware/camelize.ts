import { Context } from "koa";
import { camelizeKeys } from "humps";

const camelizeMiddleware = async (ctx: Context, next: () => Promise<any>) => {
  if (ctx.request.body) {
    const originalBody = ctx.request.body;
    ctx.request.body = camelizeKeys(ctx.request.body);

    // Don't camelize files object, because there will be paths
    // with underscores and it's user input.
    if (ctx.request.body.files) {
      ctx.request.body.files = originalBody.files;
    }
  }

  await next();
};

export default camelizeMiddleware;
