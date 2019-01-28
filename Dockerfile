FROM node:alpine
WORKDIR /src
COPY . .
RUN npm install
EXPOSE 6796
ENV NODE_ENV=production
RUN npm run start
# CMD [ "node", "server.js" ]