import * as cluster from 'cluster';
import * as os from 'os';

import server from './server';

const DEFAULT_PORT = process.env.PORT || 2000;
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  server.listen(DEFAULT_PORT);

  console.log(`Worker ${process.pid} started`);
}
