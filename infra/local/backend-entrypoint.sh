#!/bin/sh
set -eu

repository_uid="$(stat -c '%u' /app/package.json)"
repository_gid="$(stat -c '%g' /app/package.json)"

runtime_uid="${DOCKER_UID:-$repository_uid}"
runtime_gid="${DOCKER_GID:-$repository_gid}"

# Docker Desktop may report bind-mounted files as root even though writes are
# mapped to the host user. In that case, keep using the unprivileged node user.
if [ "$runtime_uid" = '0' ]; then
  runtime_uid="$(id -u node)"
fi

if [ "$runtime_gid" = '0' ]; then
  runtime_gid="$(id -g node)"
fi

mkdir -p /app/generated /app/dist
chown -R "$runtime_uid:$runtime_gid" /app/generated /app/dist

exec su-exec "$runtime_uid:$runtime_gid" "$@"
