#!/usr/bin/env bash
# First-boot setup for the glazecalc EC2 instance (official Debian 13 AMI, arm64
# or amd64). cloud-init.yaml writes this to /usr/local/sbin and runs it once as
# root; it is also safe to run again by hand.
#
# Output: /var/log/cloud-init-output.log
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

arch=$(dpkg --print-architecture)
token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')
region=$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)
raw=https://raw.githubusercontent.com/AaronFilson/glazecalc/master/deploy

# 2 GB swap file: a cushion on a 1 GB instance running Node, MongoDB and nginx.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon /swapfile 2>/dev/null || true
sysctl --system

# SSM agent (Debian AMIs do not include it), so Session Manager replaces SSH.
if ! dpkg -s amazon-ssm-agent >/dev/null 2>&1; then
  curl -fsSL -o /tmp/amazon-ssm-agent.deb \
    "https://s3.$region.amazonaws.com/amazon-ssm-$region/latest/debian_$arch/amazon-ssm-agent.deb"
  dpkg -i /tmp/amazon-ssm-agent.deb
fi
systemctl enable --now amazon-ssm-agent

# AWS CLI v2 (official installer) for Parameter Store and S3 backups.
if ! command -v aws >/dev/null; then
  curl -fsSL -o /tmp/awscliv2.zip "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip"
  unzip -q -o /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
fi

# Docker Engine and Compose from Docker's apt repository.
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $arch
Signed-By: /etc/apt/keyrings/docker.asc
EOF

# nginx and certbot come from Debian itself; certbot.timer renews certificates.
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
  nginx certbot

# App files from the repository; deploy.sh refreshes compose.prod.yaml on each deploy.
mkdir -p /opt/glazecalc
for f in deploy.sh backup.sh enable-https.sh compose.prod.yaml; do
  curl -fsSL "$raw/$f" -o "/opt/glazecalc/$f"
done
chmod 750 /opt/glazecalc/deploy.sh /opt/glazecalc/backup.sh /opt/glazecalc/enable-https.sh
for unit in glazecalc.service glazecalc-backup.service glazecalc-backup.timer mongodb-thp.service; do
  curl -fsSL "$raw/systemd/$unit" -o "/etc/systemd/system/$unit"
done

# nginx starts on plain HTTP; enable-https.sh adds HTTPS after the DNS switch.
# Once a certificate exists the HTTPS site stays in place: browsers that have
# seen the HSTS header refuse plain HTTP for a year.
https_on=false
[ -d /etc/letsencrypt/live/glazecalcapp.com ] && https_on=true
mkdir -p /var/www/certbot
if [ "$https_on" = false ]; then
  curl -fsSL "$raw/nginx/glazecalc-proxy.conf" -o /etc/nginx/snippets/glazecalc-proxy.conf
  curl -fsSL "$raw/nginx/glazecalc-http.conf" -o /etc/nginx/sites-available/glazecalc
  ln -sf /etc/nginx/sites-available/glazecalc /etc/nginx/sites-enabled/glazecalc
  rm -f /etc/nginx/sites-enabled/default
fi
nginx -t

systemctl daemon-reload
systemctl enable --now mongodb-thp.service
systemctl restart docker
systemctl enable nginx
systemctl reload-or-restart nginx
systemctl enable glazecalc.service
systemctl enable --now glazecalc-backup.timer

# First deploy: the newest master image. Later deploys come from GitHub Actions.
/opt/glazecalc/deploy.sh latest

# Run again by hand on an instance with HTTPS: refresh the nginx files from master.
if [ "$https_on" = true ]; then
  /opt/glazecalc/enable-https.sh
fi
