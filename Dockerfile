FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built app from builder
COPY --from=builder /app/.next ./.next

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
