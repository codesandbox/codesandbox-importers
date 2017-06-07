import * as Koa from 'koa';
import * as Router from 'koa-router';

import log from './utils/log';

// MIDDLEWARE
import logger from './middleware/logger';
import errorHandler from './middleware/error-handler';

// ROUTES
import githubRoute from './routes/github';

const DEFAULT_PORT = 3000;
const app = new Koa();
const router = new Router();

app.use(logger);
app.use(errorHandler);

router.get('/github/:username/:repo/tree/:branch/:path*', githubRoute);

app.use(router.routes()).use(router.allowedMethods());

log(`Listening on ${DEFAULT_PORT}`);
app.listen(3000);
