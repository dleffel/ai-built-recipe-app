import app from './server';
import serverConfig from './config/server-config';

const port = serverConfig.port;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});