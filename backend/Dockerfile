# PocketBase Dockerfile for Fly.io
FROM alpine:latest

ARG PB_VERSION=0.36.7

RUN apk add --no-cache \
    unzip \
    ca-certificates

# Download and install PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && \
    chmod +x /pb/pocketbase && \
    rm /tmp/pb.zip

# JS hooks (limits, subscription field locks, ownership)
# Note: fly deploys may also mount hooks via volume; image includes defaults.
COPY pb_hooks /pb/pb_hooks

EXPOSE 8090

# Start PocketBase with hooks enabled (dir relative to --dir if mounted)
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--hooksDir=/pb/pb_hooks"]
