# Multi-stage build for Coinshire frontend (React + Vite)
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time vars for Vite
ARG VITE_USER1_NAME
ARG VITE_USER2_NAME
ENV VITE_USER1_NAME=${VITE_USER1_NAME}
ENV VITE_USER2_NAME=${VITE_USER2_NAME}

# Install dependencies first (better caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest and build
COPY . .
RUN npm run build

# Runtime stage: Nginx to serve static files
FROM nginx:alpine AS runtime

# Add SPA-friendly nginx config (history API fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose and run
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
