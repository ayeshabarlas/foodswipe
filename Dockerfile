FROM node:18-alpine

WORKDIR /app

# Copy package files from root
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Expose port (Railway/Koyeb will override this usually, but 8080 is standard)
EXPOSE 8080

# Command to run the backend
CMD ["node", "backend/server.js"]
