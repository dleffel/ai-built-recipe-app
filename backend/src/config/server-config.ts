import dotenv from 'dotenv';

dotenv.config();

interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  clientUrl: string;
  sessionSecret: string;
}

const config: ServerConfig = {
  port: parseInt(process.env.PORT || '5001', 10), // Using port 5001 to avoid conflict with Roo Code
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000', // React default port
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
};

export default config;