require('dotenv').config();

const config = {
  port: process.env.PORT || 5001, // Using port 5001 to avoid conflict with Roo Code
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000', // React default port
};

module.exports = config;