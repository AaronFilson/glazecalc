#!/usr/bin/env bash
# Adds the MongoDB users production's database was made without: staging's
# (glazecalc_staging, readWrite on glazecalc_staging only) and an administrator
# (glazecalc_admin, userAdminAnyDatabase), with passwords from SSM
# (deploy/README.md, Staging, step 4). Run as root, once, by hand:
#
#   /opt/glazecalc/mongo-users.sh
#
# Production's MongoDB has no administrator, so the users are made with
# MongoDB started once without sign-in, cut off from every network, on the
# data volumes production's MongoDB container uses (read from it, never
# assumed). Production is down for about a minute. Every check is made before
# that; from the moment production stops, any failure still starts it again
# (trap), so a failed run leaves it as it was. A user already there is left as
# it is. Afterwards the administrator makes any later user, with no downtime.
set -euo pipefail

dir=/opt/glazecalc
admin=glazecalc-mongo-admin
health=http://127.0.0.1:3000/api/health

fail() {
  echo "$*" >&2
  exit 1
}
[ "$(id -u)" = 0 ] || fail "Run as root (sudo -i in Session Manager)."
cd "$dir"
prod() { docker compose --progress quiet -f compose.prod.yaml "$@"; }

# Everything is checked before production stops.
mongo=$(prod ps -q mongo)
[ -n "$mongo" ] || fail "Production's MongoDB is not running; nothing was changed."
image=$(docker inspect -f '{{.Image}}' "$mongo")
volume() { docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$1\"}}{{.Name}}{{end}}{{end}}" "$mongo"; }
data=$(volume /data/db)
config=$(volume /data/configdb)
[ -n "$data" ] && [ -n "$config" ] || fail "Could not tell which volumes production's MongoDB uses; nothing was changed."
[ -z "$(docker ps -aq --filter "name=^${admin}\$")" ] \
  || fail "A container named $admin is there from an earlier try: docker rm $admin (it never ran with production's MongoDB up), then run this again."
curl -fsS --max-time 5 "$health" > /dev/null || fail "Production is not healthy now; nothing was changed."

region=${AWS_REGION:-$(
  token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
  curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region
)}
param() {
  local value
  value=$(aws ssm get-parameter --region "$region" --name "$1" --with-decryption --query Parameter.Value --output text) \
    || fail "Could not read $1; nothing was changed."
  [ "${#value}" -ge 32 ] || fail "$1 is shorter than 32 characters; nothing was changed."
  printf '%s' "$value"
}
staging_pw=$(param /glazecalc/staging/mongo-password)
admin_pw=$(param /glazecalc/mongo-admin-password)

echo "MongoDB image:  $image"
echo "Data volumes:   $data (/data/db), $config (/data/configdb)"
echo "Passwords read: /glazecalc/staging/mongo-password, /glazecalc/mongo-admin-password"
read -r -p "Back up, then stop production for about a minute to add the users? Type yes: " answer
[ "$answer" = yes ] || fail "Nothing was changed."

./backup.sh || fail "The backup failed; nothing was changed."

# From here on, whatever happens, production is started again.
put_back() {
  docker stop -t 60 "$admin" > /dev/null 2>&1 || true
  docker rm "$admin" > /dev/null 2>&1 || true
  echo "Starting production."
  prod start mongo app
  for _ in $(seq 60); do
    if curl -fsS --max-time 5 "$health" > /dev/null 2>&1; then
      echo "Production is healthy."
      return
    fi
    sleep 2
  done
  echo "PRODUCTION IS NOT HEALTHY after 2 minutes: docker compose -f compose.prod.yaml ps; logs app" >&2
}
trap put_back EXIT

echo "Stopping production."
prod stop app mongo
[ -z "$(prod ps -q --status running mongo)" ] || fail "Production's MongoDB did not stop."
docker run -d --name "$admin" --network none -v "$data:/data/db" -v "$config:/data/configdb" \
  "$image" mongod --wiredTigerCacheSizeGB 0.25 --slowms 2147483647 > /dev/null
up=
for _ in $(seq 60); do
  if docker exec "$admin" mongosh --quiet --eval "db.adminCommand('ping').ok" > /dev/null 2>&1; then
    up=1
    break
  fi
  sleep 2
done
[ -n "$up" ] || {
  docker logs --tail 20 "$admin" >&2
  fail "MongoDB without sign-in did not start."
}

# Only users the app's own database already has show production's data is the one opened.
STAGING_PW=$staging_pw ADMIN_PW=$admin_pw docker exec -e STAGING_PW -e ADMIN_PW "$admin" mongosh --quiet --eval "
  if (!db.getSiblingDB('glazecalc').getUser('glazecalc')) throw new Error('This data has no glazecalc user: not production\'s');
  const add = (dbName, user, pwd, role) => {
    const target = db.getSiblingDB(dbName);
    if (target.getUser(user)) return print(user + ': already there, left as it is');
    target.createUser({ user, pwd, roles: [role] });
    print(user + ': added');
  };
  add('glazecalc_staging', 'glazecalc_staging', process.env.STAGING_PW, { role: 'readWrite', db: 'glazecalc_staging' });
  add('admin', 'glazecalc_admin', process.env.ADMIN_PW, { role: 'userAdminAnyDatabase', db: 'admin' });
"
trap - EXIT
put_back

# Each user signs in on production's MongoDB, with --auth, and has its one role.
mongo=$(prod ps -q mongo)
check() {
  echo -n "$2 signs in, roles: "
  PW=$3 docker exec -e PW "$mongo" mongosh --quiet "mongodb://localhost/$1" --eval "
    db.auth('$2', process.env.PW);
    print(JSON.stringify(db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUserRoles))"
}
check glazecalc_staging glazecalc_staging "$staging_pw"
check admin glazecalc_admin "$admin_pw"
