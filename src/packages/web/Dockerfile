FROM node:25.7.0-alpine
WORKDIR /app

COPY package.json .
RUN yarn install

COPY . .
RUN yarn build
