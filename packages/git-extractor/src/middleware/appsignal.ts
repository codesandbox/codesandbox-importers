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

  tracer.withSpan(rootSpan, async (span) => {
    try {
      await next();

      const { method, params, query, routerPath } = ctx;

      // set route params (if parsed by express correctly)
      span.setSampleData("params", { ...params, ...query });
      if (routerPath) {
        span.setName(`${method} ${routerPath}`);
      }

      span.close();
    } catch (e) {
      span.addError(e);
      span.close();
      throw e;
    }
  });
};

export default appSignal;
