# Development image only — runs Vite's dev server with hot module reload.
# Not a production build (that would use a multi-stage build + a static
# file server); we'll harden this later.
FROM node:20-slim

WORKDIR /app

# Copy just the manifest files first so Docker can cache the npm install
# layer and skip re-running it when only source files change.
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host 0.0.0.0 is required: Vite's dev server binds to localhost by
# default, which would be unreachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
