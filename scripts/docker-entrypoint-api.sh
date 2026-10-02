#!/bin/sh
set -e

# Migrations and seed are release operations, not container startup side effects.
exec "$@"
