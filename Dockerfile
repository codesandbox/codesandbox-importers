FROM node:19-alpine as build
WORKDIR /app
COPY package.json yarn.lock ./

RUN yarn

# Bundle app source
COPY . .

RUN yarn build

FROM node:19-alpine

WORKDIR /app

COPY --chown=node:node --from=build /app/node_modules node_modules
COPY --chown=node:node --from=build /app/dist dist
COPY --chown=node:node --from=build /app/package.json ./

USER node

CMD ["node", "./packages/git-extractor/dist/index.js"]
