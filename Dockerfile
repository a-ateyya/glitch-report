FROM node:20-slim

# Build tools needed for better-sqlite3 native module compilation
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install all dependencies (including dev for build step)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Copy seed data to dist so server can find it at __dirname/seed.sql
RUN cp server/seed.sql dist/seed.sql

# Remove dev dependencies after build
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "dist/index.cjs"]
