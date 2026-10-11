#!/bin/sh
set -eu
set -f
umask 077

# Values are network identities, never directives. Native nginx -t supplies the
# final address/CIDR validation, and malformed configuration aborts startup.
realip_file=$(mktemp /etc/nginx/yor-trusted-edge-realip.XXXXXX)
geo_file=$(mktemp /etc/nginx/yor-trusted-edge-geo.XXXXXX)
trap 'rm -f "$realip_file" "$geo_file"' EXIT HUP INT TERM
IFS=', '
for cidr in ${TRUSTED_EDGE_CIDRS:-}; do
  case "$cidr" in
    ''|*[!0-9A-Fa-f.:/]*)
      echo 'Invalid TRUSTED_EDGE_CIDRS: use explicit proxy IP addresses/CIDRs' >&2
      exit 1
      ;;
  esac
  case "$cidr" in
    */*)
      prefix=${cidr##*/}
      case "$prefix" in
        ''|*[!0-9]*) echo 'Invalid TRUSTED_EDGE_CIDRS prefix' >&2; exit 1 ;;
      esac
      if [ "$prefix" -le 0 ]; then
        echo 'Invalid TRUSTED_EDGE_CIDRS: cannot trust all clients' >&2
        exit 1
      fi
      ;;
  esac
  normalized_cidr=$(printf '%s' "$cidr" | tr 'A-F' 'a-f')
  case "$normalized_cidr" in
    *:ffff:*/*)
      prefix=${cidr##*/}
      if [ "$prefix" -le 96 ]; then
        echo 'Invalid TRUSTED_EDGE_CIDRS: mapped IPv4 cannot trust all clients' >&2
        exit 1
      fi
      ;;
  esac
  printf 'set_real_ip_from %s;\n' "$cidr" >> "$realip_file"
  printf '%s 1;\n' "$cidr" >> "$geo_file"
done
mv "$realip_file" /etc/nginx/yor-trusted-edge-realip.conf
mv "$geo_file" /etc/nginx/yor-trusted-edge-geo.conf
nginx -t -q
