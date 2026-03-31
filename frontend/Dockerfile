# frontend/Dockerfile
# Stage 1: Build
FROM node:20-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM nginx:alpine

# Copy the build output from Stage 1 to Nginx's serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx config to handle React Router and API proxying
# Create a basic nginx.conf in the same directory (optional but recommended)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]