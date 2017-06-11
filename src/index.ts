import * as Koa from 'koa';
import * as Router from 'koa-router';

import log from './utils/log';

// MIDDLEWARE
import logger from './middleware/logger';
import errorHandler from './middleware/error-handler';
import decamelize from './middleware/decamelize';
import notFound from './middleware/not-found';

// ROUTES
import { info as githubInfo, data as githubData } from './routes/github';

const DEFAULT_PORT = 2000;
const app = new Koa();
const router = new Router();

app.use(logger);
app.use(errorHandler);
app.use(decamelize);
app.use(notFound);

router
  .get('/git/github/data/:username/:repo/:branch/path/:path*', githubData)
  .get('/git/github/info/:username/:repo/tree/:branch/:path*', githubInfo);

app.use(router.routes()).use(router.allowedMethods());

log(`Listening on ${DEFAULT_PORT}`);
app.listen(DEFAULT_PORT);
