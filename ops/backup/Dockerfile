FROM postgres:16-alpine
RUN apk add --no-cache age rclone bash
COPY lib/db/scripts/backup-database.sh /usr/local/bin/backup-database.sh
COPY lib/db/scripts/schema-object-inspection.sql /usr/local/bin/schema-object-inspection.sql
RUN sed -i 's/\r$//' /usr/local/bin/backup-database.sh && chmod 0755 /usr/local/bin/backup-database.sh
ENTRYPOINT ["/usr/local/bin/backup-database.sh"]
