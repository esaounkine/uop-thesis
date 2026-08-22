# Stage 1 - build web
FROM node:25.7.0-alpine AS web
WORKDIR /web
COPY packages/web/package.json .
RUN yarn install
COPY packages/web .
RUN yarn build

# Stage 2 - build API
FROM node:25.7.0-alpine
WORKDIR /app
COPY packages/backend/package.json .
RUN yarn install --production
COPY packages/backend .
COPY --from=web /web/dist ./public
EXPOSE 3000
CMD ["node", "src/server.js"]
