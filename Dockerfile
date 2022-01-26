FROM node:16-alpine
RUN apk update && \
    apk add --no-cache tzdata
RUN adduser node root
COPY . /home/node/app
RUN chmod -R 755 /home/node/app
RUN chown -R node:node /home/node/app

WORKDIR /home/node/app

RUN npm install

# EXPOSE PORT 8080
EXPOSE 8080

# START APPLICATION
CMD [ "npm", "start" ]


