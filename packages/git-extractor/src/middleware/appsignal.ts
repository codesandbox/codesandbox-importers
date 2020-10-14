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
  const { method, params, query, _matchedRouteName } = ctx;

  if (_matchedRouteName) {
    rootSpan.setName(`${method} ${_matchedRouteName}`);
  }

  // set route params (if parsed by express correctly)
  rootSpan.setSampleData("params", { ...params, ...query });

  try {
    await next();
  } catch (e) {
    rootSpan.addError(e);
    throw e;
  }
};

export default appSignal;
