# Use Node 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install dependencies (only production)
RUN npm install --production --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the port (Koyeb uses PORT env var, but we'll expose 8080 as default)
EXPOSE 8080

# Health check (useful for Koyeb/Docker)
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the backend server
# v1.0.7 - Trigger
CMD ["node", "backend/server.js"]
