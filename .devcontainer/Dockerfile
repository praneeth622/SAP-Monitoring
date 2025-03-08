FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Install some generally useful tools
RUN apt-get update \
    && apt-get -y install --no-install-recommends \
    curl git sqlite3 entr source-highlight

ARG CAPVER="latest"
RUN npm install -g @sap/cds-dk@$CAPVER
RUN npm install -g nodemon

WORKDIR /home/node