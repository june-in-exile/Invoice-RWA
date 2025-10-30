FROM node:18-alpine

# Install required dependencies for SQLite and native builds
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++ \
    gcc

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --production

# Copy application source code
COPY src/ ./src/

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Create directory for SQLite database (ROFL will mount persistent storage here)
RUN mkdir -p /rofl/storage

# Set environment variables for ROFL deployment
ENV NODE_ENV=production
ENV DB_TYPE=sqlite
ENV DB_PATH=/rofl/storage/invoice_rwa.db

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application using the startup script
CMD ["/start.sh"]
