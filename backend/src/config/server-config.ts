import dotenv from 'dotenv';

dotenv.config();

interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
}

const config: ServerConfig = {
  port: parseInt(process.env.PORT || '5001', 10), // Using port 5001 to avoid conflict with Roo Code
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000', // React default port
};

export default config;