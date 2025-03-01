/* istanbul ignore file */
import http from 'http';
import app from './server';

import config from './config/server-config';

const port = config.port;

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});