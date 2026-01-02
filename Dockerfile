FROM node:18-slim

WORKDIR /app

# Copy package files from root
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the entire project (including backend folder)
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the application using the root package.json script
CMD ["npm", "start"]
