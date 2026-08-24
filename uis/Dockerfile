FROM node:20-alpine

WORKDIR /app/website

# Copy package files first (for Docker layer caching)
COPY website/package.json website/package-lock.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application code
COPY website/ ./


# Copy the startup script
WORKDIR /app
COPY start.sh .
RUN chmod +x start.sh

# Expose the port Next.js runs on by default
EXPOSE 3000

# Default command: run start.sh
CMD ["./start.sh"]