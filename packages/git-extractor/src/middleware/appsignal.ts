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
    const { method, params, query, _matchedRouteName } = ctx;
    console.log({ method, params, query, _matchedRouteName });

    if (_matchedRouteName) {
      span.setName(`${method} ${_matchedRouteName}`);
    }

    // set route params (if parsed by express correctly)
    span.setSampleData("params", { ...params, ...query });

    try {
      await next();
    } catch (e) {
      span.addError(e);
      throw e;
    } finally {
      span.close();
    }
  });
};

export default appSignal;
