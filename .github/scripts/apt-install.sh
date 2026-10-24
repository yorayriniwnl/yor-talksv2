#!/usr/bin/env bash
# Install apt packages on GitHub-hosted runners without hanging on a stalled
# mirror: bound each network operation, retry, and fall back from the Azure
# mirror to the main Ubuntu archive.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt_opts=(-o Acquire::Retries=3 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30)

install() {
  timeout 240 sudo -E apt-get "${apt_opts[@]}" update &&
    timeout 240 sudo -E apt-get "${apt_opts[@]}" install --yes --no-install-recommends "$@"
}

if install "$@"; then exit 0; fi
echo "::warning::apt install stalled on the default mirror; retrying with archive.ubuntu.com"
sudo find /etc/apt -name '*.list' -o -name '*.sources' | while read -r file; do
  sudo sed -i 's#http://azure\.archive\.ubuntu\.com#http://archive.ubuntu.com#g' "$file"
done
install "$@"
