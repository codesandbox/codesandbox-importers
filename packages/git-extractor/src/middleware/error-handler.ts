import { Context } from "koa";

// Error handler
const errorHandler = async (ctx: Context, next: () => Promise<any>) => {
  try {
    await next();
  } catch (e) {
    console.log("ERROR HAS BEEN CAUGHT")
    ctx.status = e.status || (e.response && e.response.status) || 500;
    console.log("status", ctx.status)
    ctx.body = {
      error:
        e.response && e.response.data ? e.response.data.message : e.message,
    };

    if (e.response && e.response.data) {
      console.log("ERROR: " + e.response.data.message);
    }

    ctx.app.emit("error", e, ctx);
  }
};

export default errorHandler;
