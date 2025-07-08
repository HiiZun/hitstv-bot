# Use official Node.js LTS image
FROM node:22-alpine

# Install FFmpeg and build dependencies for native modules
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Environment variables (will be overridden by docker-compose or runtime)
ENV NODE_ENV=production
ENV DEBUG=false

# Expose port (if needed for future web interface)
EXPOSE 3000

# Start the application
CMD ["node", "src/index.js"]