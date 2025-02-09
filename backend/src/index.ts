/* istanbul ignore file */
import http from 'http';
import app from './server';

const port = process.env.PORT || 5001;

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});