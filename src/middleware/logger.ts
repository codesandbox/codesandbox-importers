import { Middleware, Context } from 'koa';

import log from '../utils/log';

const logger = async (ctx: Context, next: () => Promise<any>) => {
  const start = +new Date();
  await next();
  const ms = +new Date() - start;
  log(`${ctx.method} ${ctx.url} - ${ms}ms`);
};

export default logger;
