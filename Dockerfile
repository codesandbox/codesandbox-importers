FROM node:19-alpine as build
WORKDIR /app
COPY . .

RUN yarn

RUN yarn build

USER node

CMD ["node", "./packages/git-extractor/dist/index.js"]
