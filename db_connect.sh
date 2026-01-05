#!/bin/bash
# Database connection script for XAMPP MySQL
# Use this to run queries against the database

SOCKET="/opt/lampp/var/mysql/mysql.sock"
DB="school_event_management"
USER="root"

mariadb -u "$USER" --socket="$SOCKET" "$DB" "$@"
