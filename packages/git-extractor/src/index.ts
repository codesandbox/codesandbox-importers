import * as Sentry from "@sentry/node";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as Router from "@koa/router";

import camelize from "./middleware/camelize";
import decamelize from "./middleware/decamelize";
import errorHandler from "./middleware/error-handler";
import appSignalMiddleware from "./middleware/appsignal";
// MIDDLEWARE
import logger from "./middleware/logger";
import notFound from "./middleware/not-found";
import * as define from "./routes/define";
// ROUTES
import * as github from "./routes/github";
import { appsignal } from "./utils/appsignal";
import log from "./utils/log";

Sentry.init({
  dsn: "https://4917ce43c4ca42a1acb85b2843b79c6b@sentry.io/4377691",
});

const DEFAULT_PORT = process.env.PORT || 2000;
const app = new Koa();
const router = new Router();

app.use(errorHandler);
app.use(logger);
app.use(bodyParser({ jsonLimit: "50mb" }));
app.use(camelize);
app.use(decamelize);
app.use(notFound);
app.use(appSignalMiddleware);

router
  .get(
    "/git/github/data/:username/:repo/:branch*/commit/:commitSha/path/:path*",
    github.data
  )
  .get("/git/github/rights/:username/:repo", github.getRights)
  .get("/git/github/info/:username/:repo/tree/:branch/:path*", github.info) // allow tree urls
  .get("/git/github/info/:username/:repo/blob/:branch/:path*", github.info) // allow blob urls
  .get("/git/github/info/:username/:repo/commit/:branch", github.info) // allow commit urls
  .get("/git/github/info/:username/:repo", github.info) // For when tree isn't in path (root path)
  .get("/git/github/info/:username/:repo/pull/:pull", github.pullInfo) // allow pull urls
  .post("/git/github/compare/:username/:repo", github.compare) // Compare changes between branches and commits
  // Push
  .post(
    "/git/github/commit/:username/:repo/:branch*/path/:path*",
    github.commit
  )
  .post("/git/github/pr/:username/:repo/:branch*/path/:path*", github.pr)
  .post("/git/github/repo/:username/:repo", github.repo)
  .post("/define", define.define);

app.use(router.routes()).use(router.allowedMethods());

log(`Listening on ${DEFAULT_PORT}`);
app.listen(DEFAULT_PORT);

console.log(
  JSON.stringify({
    message: `AppSignal ${appsignal.VERSION}, active: ${appsignal.isActive}`,
  })
);

app.on("error", (err, ctx) => {
  const span = appsignal.tracer().currentSpan();
  if (span) {
    span.addError(err);
  }

  Sentry.withScope(function (scope) {
    scope.addEventProcessor(function (event) {
      return Sentry.Handlers.parseRequest(event, ctx.request);
    });
    Sentry.captureException(err);
  });
});
