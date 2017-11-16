import { Context } from 'koa';
import { camelizeKeys } from 'humps';

const camelizeMiddleware = async (ctx: Context, next: () => Promise<any>) => {
  if (ctx.request.body) {
    ctx.request.body = camelizeKeys(ctx.request.body);
  }

  await next();
};

export default camelizeMiddleware;
