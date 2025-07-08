# Use official Node.js LTS image
FROM node:22-alpine

# Install FFmpeg and build dependencies needed for sodium-native
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

# Remove only the problematic opus dependency, keep sodium-native for encryption
RUN npm pkg delete dependencies.@discordjs/opus && \
    npm install opusscript --save && \
    npm install --production

# Copy source code
COPY . .

# Environment variables (will be overridden by docker-compose or runtime)
ENV NODE_ENV=production
ENV DEBUG=false

# Expose port (if needed for future web interface)
EXPOSE 3000

# Start the application
CMD ["node", "src/index.js"]