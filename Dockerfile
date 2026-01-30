# Use Node 20 LTS for better Next.js 15 support
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy root package files
COPY package*.json ./

# Copy backend and frontend package files to install all dependencies
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies
RUN npm install --legacy-peer-deps
RUN cd frontend && npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Clear any previous builds and build the frontend
RUN cd frontend && rm -rf .next && npm run build

# Expose the port
EXPOSE 10000

# Start the backend server which now serves the frontend too
CMD ["node", "backend/server.js"]
