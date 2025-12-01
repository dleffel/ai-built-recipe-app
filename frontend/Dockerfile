# Build stage
FROM --platform=linux/amd64 node:18-alpine as builder

# Set working directory
WORKDIR /app

# Set build arguments and environment
ARG REACT_APP_API_URL
ARG REACT_APP_ENABLE_DEV_LOGIN
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_ENABLE_DEV_LOGIN=$REACT_APP_ENABLE_DEV_LOGIN
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install dependencies using clean install
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM --platform=linux/amd64 nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]