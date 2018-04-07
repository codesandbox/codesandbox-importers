import * as Koa from "koa";
import * as Router from "koa-router";

import * as bodyParser from "koa-bodyparser";

import log from "./utils/log";

// MIDDLEWARE
import logger from "./middleware/logger";
import errorHandler from "./middleware/error-handler";
import decamelize from "./middleware/decamelize";
import camelize from "./middleware/camelize";
import notFound from "./middleware/not-found";

// ROUTES
import * as github from "./routes/github";
import * as define from "./routes/define";

const DEFAULT_PORT = process.env.PORT || 2000;
const app = new Koa();
const router = new Router();

app.use(logger);
app.use(errorHandler);
app.use(bodyParser());
app.use(camelize);
app.use(decamelize);
app.use(notFound);

router
  .get(
    "/git/github/data/:username/:repo/:branch*/commit/:commitSha/path/:path*",
    github.data
  )
  .get("/git/github/info/:username/:repo/tree/:branch/:path*", github.info) // allow tree urls
  .get("/git/github/info/:username/:repo/blob/:branch/:path*", github.info) // allow blob urls
  .get("/git/github/info/:username/:repo", github.info) // For when tree isn't in path (root path)
  // Push
  .post("/git/github/diff/:username/:repo/:branch*/path/:path*", github.diff)
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
