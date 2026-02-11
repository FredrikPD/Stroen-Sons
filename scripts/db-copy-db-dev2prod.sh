#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# PROD -> DEV refresh (Postgres) using .env:
#   DEV  = DIRECT_URL
#   PROD = DIRECT_URL_PROD
#
# Keep these DEV tables unchanged (Clerk dev linkage):
#   - Member
#   - MembershipType
#   - UserRole
#
# We rewrite any foreign keys that point to Member (prod member IDs) so they
# point to ONE DEV member (fallback), to avoid FK violations.
#
# Requirements: psql, pg_dump, python3
###############################################################################

# --- Load .env ---
if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
else
  echo "ERROR: .env not found in current directory: $(pwd)" >&2
  exit 1
fi

: "${DIRECT_URL:?DIRECT_URL (DEV) is required in .env}"
: "${DIRECT_URL_PROD:?DIRECT_URL_PROD (PROD) is required in .env}"

DEV_DATABASE_URL="$DIRECT_URL"
PROD_DATABASE_URL="$DIRECT_URL_PROD"

SCHEMA="${SCHEMA:-public}"

# Tables that must remain as-is in DEV
KEEP_TABLES=("Member" "MembershipType" "UserRole")

# Files
DUMP_SQL="${DUMP_SQL:-./prod_data.sql}"
TRANSFORMED_SQL="${TRANSFORMED_SQL:-./prod_data.transformed.sql}"

need_bin() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: '$1' not found in PATH" >&2; exit 1; }; }
need_bin psql
need_bin pg_dump
need_bin python3

echo "==> Starting PROD -> DEV refresh (keep Clerk-dev members; rewrite member FKs)"
echo "    Schema: $SCHEMA"
echo "    Keeping DEV tables unchanged: ${KEEP_TABLES[*]}"
echo "    Dump SQL: $DUMP_SQL"
echo "    Transformed SQL: $TRANSFORMED_SQL"
echo

echo "==> DEV identity:"
psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT current_database() AS db, current_user AS usr, inet_server_addr() AS server_ip, inet_server_port() AS port;'
echo

echo "==> PROD identity:"
psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT current_database() AS db, current_user AS usr, inet_server_addr() AS server_ip, inet_server_port() AS port;'
echo

# --- Determine fallback DEV member id ---
DEV_FALLBACK_MEMBER_ID="${DEV_FALLBACK_MEMBER_ID:-}"

if [[ -z "$DEV_FALLBACK_MEMBER_ID" ]]; then
  DEV_FALLBACK_MEMBER_ID="$(psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -At \
    -c "SELECT id FROM ${SCHEMA}.\"Member\" ORDER BY \"createdAt\" ASC NULLS LAST LIMIT 1;" 2>/dev/null || true)"
fi

if [[ -z "$DEV_FALLBACK_MEMBER_ID" ]]; then
  echo "ERROR: Could not find a DEV Member id to use as fallback." >&2
  echo "Create at least one Member in DEV (via your app/Clerk dev), or set DEV_FALLBACK_MEMBER_ID in .env." >&2
  exit 2
fi

echo "==> Using DEV_FALLBACK_MEMBER_ID: $DEV_FALLBACK_MEMBER_ID"
echo

# --- Step 1: Dump PROD data-only SQL excluding keep tables ---
echo "==> Step 1/4: Dumping PROD as DATA-ONLY SQL (excluding keep tables)..."
DUMP_ARGS=(--data-only --no-owner --no-privileges --schema="$SCHEMA")
for t in "${KEEP_TABLES[@]}"; do
  DUMP_ARGS+=( --exclude-table-data="${SCHEMA}.\"${t}\"" )
done

pg_dump "${DUMP_ARGS[@]}" "$PROD_DATABASE_URL" > "$DUMP_SQL"
echo "==> Dumped to $DUMP_SQL"
echo

# --- Step 2: Transform SQL so all Member-referencing FKs point to fallback DEV member ---
echo "==> Step 2/4: Rewriting Member foreign keys inside COPY data to fallback DEV member..."

python3 - "$SCHEMA" "$DEV_FALLBACK_MEMBER_ID" "$DUMP_SQL" "$TRANSFORMED_SQL" <<'PY'
import re
import sys
from pathlib import Path

schema = sys.argv[1]
fallback = sys.argv[2]
inp = Path(sys.argv[3])
outp = Path(sys.argv[4])

# Tables/columns in your dump that reference Member IDs and must be rewritten.
member_fk_cols_by_table = {
    "Event": {"createdById"},
    "Post": {"authorId"},
    "Notification": {"memberId"},
    "Payment": {"memberId"},
    "Transaction": {"memberId"},
    "PaymentRequest": {"memberId"},
    # Join table: usually A=Event, B=Member
    "_EventAttendees": {"B"},
}

copy_re = re.compile(rf'^COPY {re.escape(schema)}\."([^"]+)" \((.*?)\) FROM stdin;')

def parse_cols(cols_str: str):
    cols = []
    for c in cols_str.split(","):
        c = c.strip()
        if c.startswith('"') and c.endswith('"'):
            c = c[1:-1]
        cols.append(c)
    return cols

lines = inp.read_text(encoding="utf-8").splitlines(keepends=True)
out_lines = []

in_copy = False
table = None
rewrite_idx = []

for line in lines:
    if not in_copy:
        m = copy_re.match(line)
        if m:
            table = m.group(1)
            cols = parse_cols(m.group(2))
            targets = member_fk_cols_by_table.get(table, set())
            rewrite_idx = [i for i, c in enumerate(cols) if c in targets]
            in_copy = True
            out_lines.append(line)
        else:
            out_lines.append(line)
        continue

    # End of COPY block
    if line.strip() == r"\.":
        in_copy = False
        table = None
        rewrite_idx = []
        out_lines.append(line)
        continue

    # Data row (tab-separated). \N = NULL
    if rewrite_idx:
        row = line.rstrip("\n").rstrip("\r")
        fields = row.split("\t")
        for idx in rewrite_idx:
            if idx < len(fields) and fields[idx] != r"\N":
                fields[idx] = fallback
        out_lines.append("\t".join(fields) + ("\n" if line.endswith("\n") else ""))
    else:
        out_lines.append(line)

outp.write_text("".join(out_lines), encoding="utf-8")
print(f"Wrote transformed SQL: {outp}")
PY

echo "==> Transformed SQL written to $TRANSFORMED_SQL"
echo

# --- Step 3: Truncate DEV except keep tables ---
echo "==> Step 3/4: Truncating DEV tables (excluding keep tables)..."
KEEP_IN_LIST="$(printf "'%s'," "${KEEP_TABLES[@]}")'_prisma_migrations'"

psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = '${SCHEMA}'
      AND tablename NOT IN (${KEEP_IN_LIST})
  LOOP
    EXECUTE format('TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE;', r.schemaname, r.tablename);
  END LOOP;
END \$\$;
SQL
echo "==> DEV truncated."
echo

# --- Step 4: Apply transformed SQL to DEV ---
echo "==> Step 4/4: Applying transformed PROD data to DEV..."
psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$TRANSFORMED_SQL"
echo "==> Restore complete."
echo

echo "==> DEV post-restore quick counts:"
psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) AS event_count FROM ${SCHEMA}.\"Event\";" 2>/dev/null || true
psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) AS post_count FROM ${SCHEMA}.\"Post\";" 2>/dev/null || true
psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) AS attendee_count FROM ${SCHEMA}.\"_EventAttendees\";" 2>/dev/null || true
echo

echo "✅ Done."
echo "Kept: ${KEEP_TABLES[*]} (DEV/Clerk-dev intact)."
echo "Rewrote Member FKs in imported data to DEV_FALLBACK_MEMBER_ID=$DEV_FALLBACK_MEMBER_ID."