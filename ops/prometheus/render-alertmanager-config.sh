#!/bin/sh
set -eu
: "${ALERTMANAGER_WEBHOOK_URL:?ALERTMANAGER_WEBHOOK_URL is required}"
: "${ALERTMANAGER_WEBHOOK_USER:?ALERTMANAGER_WEBHOOK_USER is required}"
umask 077

awk '
function quote_yaml(value, result, i, character, code) {
  result = "\""
  for (i = 1; i <= length(value); i++) {
    character = substr(value, i, 1)
    if (character == "\\") result = result "\\\\"
    else if (character == "\"") result = result "\\\""
    else if (character == "\n") result = result "\\n"
    else if (character == "\r") result = result "\\r"
    else if (character == "\t") result = result "\\t"
    else {
      for (code = 1; code <= 31; code++) {
        if (character == sprintf("%c", code)) {
          result = result sprintf("\\x%02X", code)
          character = ""
          break
        }
      }
      if (character != "") result = result character
    }
  }
  return result "\""
}
function render_marker(marker, value, line, position) {
  position = index($0, marker)
  line = substr($0, 1, position - 1) quote_yaml(value) substr($0, position + length(marker))
  print line
}
index($0, "@ALERTMANAGER_WEBHOOK_URL@") { render_marker("@ALERTMANAGER_WEBHOOK_URL@", ENVIRON["ALERTMANAGER_WEBHOOK_URL"]); next }
index($0, "@ALERTMANAGER_WEBHOOK_USER@") { render_marker("@ALERTMANAGER_WEBHOOK_USER@", ENVIRON["ALERTMANAGER_WEBHOOK_USER"]); next }
{ print }
' /etc/alertmanager/alertmanager.yml.template > /run/alertmanager/alertmanager.yml

exec /bin/alertmanager --config.file=/run/alertmanager/alertmanager.yml --storage.path=/alertmanager