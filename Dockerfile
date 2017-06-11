FROM ubuntu:16.10
MAINTAINER Ives van Hoorne

RUN apt-get update && apt-get install -y curl \
    && curl -sL https://deb.nodesource.com/setup_7.x | bash - \
    && apt-get update && apt-get install -y nodejs build-essential \
    && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
    && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update && apt-get install -y yarn

RUN mkdir /usr/src/app

WORKDIR /usr/src/app
