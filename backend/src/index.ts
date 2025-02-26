/* istanbul ignore file */
import http from 'http';
import app from './server';

const port = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});