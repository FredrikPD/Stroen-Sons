Check if the production database schema is up to date with the development database, and update it if needed.

Use the following environment variables from the `.env` file to connect:
- Development DB: `DATABASE_URL` and `DIRECT_URL`
- Production DB: `DATABASE_URL_PROD` and `DIRECT_URL_PROD`

Steps:
1. Read the `.env` file to confirm these variables are present
2. Compare the schemas of the development and production databases (e.g. via Prisma migrate status, or by diffing migration history)
3. If they are in sync, confirm that clearly and stop
4. If production is behind, list the pending migrations and ask for confirmation before applying
5. Once confirmed, run the migrations against production using `DATABASE_URL_PROD` and `DIRECT_URL_PROD`
6. Confirm the migration was successful and that the databases are now in sync