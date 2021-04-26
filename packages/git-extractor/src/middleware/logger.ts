import { Middleware, Context } from "koa";

interface ILogParams {
  method: string;
  url: string;
  duration: number;
  error?: string;
}

function log({ method, url, duration, error }: ILogParams) {
  const log = {
    method,
    path: url,
    duration,
    error,
  };
  console.log(JSON.stringify(log));
}

const logger = async (ctx: Context, next: () => Promise<any>) => {
  const start = +new Date();

  try {
    await next();
  } catch (e) {
    const ms = +new Date() - start;
    log({ method: ctx.method, duration: ms, error: e.message, url: ctx.url });
    throw e;
  }

  const ms = +new Date() - start;
  log({ method: ctx.method, duration: ms, url: ctx.url });
};

export default logger;
