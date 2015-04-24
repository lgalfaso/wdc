FROM node:0.12
MAINTAINER Oleksandr Sochka "sasha.sochka@gmail.com"

# Set production settings
ENV PRODUCTION true
ENV NPM_CONFIG_PRODUCTION true

COPY package.json /tmp/package.json
COPY proc /tmp/proc
RUN cd /tmp && npm install
RUN mkdir -p /app
RUN cp -a /tmp/node_modules /app/
COPY . /app

WORKDIR /app
RUN npm run-script postinstall # for some reason this is not called automatically in docker

ENV PORT 80
EXPOSE 80

CMD ["node", "app.js", "--prod"]

