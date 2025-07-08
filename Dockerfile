# Use official Node.js LTS image (latest stable)
FROM node:22.17.0-alpine

# Install FFmpeg (only requirement for audio processing)
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Remove only the problematic opus dependency, keep encryption packages
RUN npm pkg delete dependencies.@discordjs/opus dependencies.sodium-native && \
    npm install --production --legacy-peer-deps

# Copy source code
COPY . .

# Environment variables (will be overridden by docker-compose or runtime)
ENV NODE_ENV=production
ENV DEBUG=false

# Expose port (if needed for future web interface)
EXPOSE 3000

# Start the application
CMD ["node", "src/index.js"]