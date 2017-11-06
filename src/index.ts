import * as Koa from 'koa';
import * as Router from 'koa-router';

import * as bodyParser from 'koa-bodyparser';

import log from './utils/log';

// MIDDLEWARE
import logger from './middleware/logger';
import errorHandler from './middleware/error-handler';
import decamelize from './middleware/decamelize';
import camelize from './middleware/camelize';
import notFound from './middleware/not-found';

// ROUTES
import {
  info as githubInfo,
  data as githubData,
  diff as githubDiff,
} from './routes/github';

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
  .get('/git/github/data/:username/:repo/:sha/:branch*/path/:path*', githubData)
  .get('/git/github/info/:username/:repo/tree/:branch/:path*', githubInfo) // allow tree urls
  .get('/git/github/info/:username/:repo/blob/:branch/:path*', githubInfo) // allow blob urls
  .get('/git/github/info/:username/:repo', githubInfo) // For when tree isn't in path (root path)
  // Push
  .post('/git/github/diff/:username/:repo/:branch*/path/:path*', githubDiff);

app.use(router.routes()).use(router.allowedMethods());

log(`Listening on ${DEFAULT_PORT}`);
app.listen(DEFAULT_PORT);
