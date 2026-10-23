# Stage 1 - build web
FROM node:25.7.0-alpine AS web
WORKDIR /web
COPY packages/web/package.json .
RUN yarn install
COPY packages/web .
RUN yarn build

# Stage 2 - install backend production dependencies
FROM node:25.7.0-alpine AS api
WORKDIR /app
COPY packages/backend/package.json .
RUN yarn install --production

# Stage 3 - runtime (backend + web - yarn cache)
FROM node:25.7.0-alpine
WORKDIR /app
COPY --from=api /app/node_modules ./node_modules
COPY packages/backend .
COPY --from=web /web/dist ./public
EXPOSE 3000
CMD ["node", "src/server.js"]
