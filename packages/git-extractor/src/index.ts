import * as Sentry from "@sentry/node";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as Router from "koa-router";

import camelize from "./middleware/camelize";
import decamelize from "./middleware/decamelize";
import errorHandler from "./middleware/error-handler";
// MIDDLEWARE
import logger from "./middleware/logger";
import notFound from "./middleware/not-found";
import * as define from "./routes/define";
// ROUTES
import * as github from "./routes/github";
import log from "./utils/log";

Sentry.init({
  dsn: "https://4917ce43c4ca42a1acb85b2843b79c6b@sentry.io/4377691",
});

const DEFAULT_PORT = process.env.PORT || 2000;
const app = new Koa();
const router = new Router();

app.use(errorHandler);
app.use(logger);
app.use(bodyParser());
app.use(camelize);
app.use(decamelize);
app.use(notFound);

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
  .get("/git/github/compare/:username/:repo/:branch", github.compare)
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

/*
    # 1 Create repo
    - Review github.data // Download existing
    - Review github.repo // Create new one
    - Review github.info // General info about the repo, not sure when it is used? To get latest commit sha maybe?
    
    # 2 Create PR
    - Review github.getRights
    - Review github.pr

    # 3 Update PR
    - Review github.commit

    # 4 Status of PR
    - Review github.pullInfo

    # 5 Conflict 
    - To get files changed between two commits. Related to updating a PR where SHA is different
      https://developer.github.com/v3/repos/commits/#compare-two-commits
    - How to get the files in conflict on a PR? 


Okay, so these are the changes I need:

# post("/git/github/pr/:username/:repo/:branch*\/path/:path*", github.pr)
- Pass in sandboxId as well on the payload, this will become the branch name
- As I understand the correct branch will now be returned as well so that further commits will go to this branch

# get("/git/github/info/:username/:repo/pull/:pull", github.pullInfo)
- Also needs to return the new "merged", "mergeable" and "rebaseable"

*/
