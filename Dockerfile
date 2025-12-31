FROM node:18-alpine
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source
COPY backend ./backend

# Runtime env
ENV NODE_ENV=production
EXPOSE 8080

# Start backend server
CMD ["node", "backend/server.js"]
