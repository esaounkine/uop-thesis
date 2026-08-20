FROM node:25.7.0-alpine
WORKDIR /app

COPY package.json .
RUN yarn install --production

COPY . .

EXPOSE 3000
CMD ["node", "src/server.js"]
