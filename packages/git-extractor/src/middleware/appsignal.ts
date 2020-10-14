import { Context } from "koa";
import { appsignal } from "../utils/appsignal";

const appSignal = async (ctx: Context, next: () => Promise<any>) => {
  const tracer = appsignal.tracer();
  const rootSpan = tracer.currentSpan();

  if (!rootSpan) {
    return next();
  }

  const { req, res } = ctx;
  tracer.wrapEmitter(req);
  tracer.wrapEmitter(res);

  // identifies the span in the stacked graphs
  rootSpan.setCategory("process_request.koa");

  return tracer.withSpan(rootSpan, async (span) => {
    try {
      await next();
    } finally {
      const { method, params = {}, query = {}, routerPath } = ctx;

      // set route params (if parsed by koa correctly)
      span.setSampleData("params", { ...params, ...query });
      if (routerPath) {
        span.setName(`${method} ${routerPath}`);
      }

      span.close();
    }
  });
};

export default appSignal;
