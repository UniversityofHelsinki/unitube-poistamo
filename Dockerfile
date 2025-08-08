FROM node:24-alpine
RUN apk update && \
    apk add --no-cache tzdata
RUN adduser node root
COPY . /home/node/app
RUN chmod -R 755 /home/node/app
RUN chown -R node:node /home/node/app

WORKDIR /home/node/app

# added this config because of bug in node18 alpine image https://github.com/nodejs/docker-node/issues/1749
ENV npm_config_cache /tmp/npm

# EXPOSE PORT 8080
EXPOSE 8080

# START APPLICATION
CMD [ "npm", "start" ]


