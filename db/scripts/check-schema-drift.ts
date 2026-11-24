/**
 * Schema drift check: compares the database built from db/migrations with
 * prisma/schema.prisma.
 *
 * Fails when a table or column exists on one side but not the other, or when a
 * column's nullability differs. Those are the mismatches that break at runtime and
 * that mock-based unit tests can't see. Index names, FK names and VARCHAR vs TEXT
 * differences are ignored: Prisma doesn't need them declared.
 *
 * Usage (run against a database that has just had every migration applied):
 *   DATABASE_URL=postgresql://... pnpm db:check-drift
 */
import { Client } from 'pg';
import { Prisma } from '@prisma/client';

// Tables the migration tooling owns; they are not part of the app schema.
const IGNORED_TABLES = new Set(['schema_migrations']);

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ table_name: string; column_name: string; is_nullable: 'YES' | 'NO' }>(
    `SELECT table_name, column_name, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public'`,
  );
  await client.end();

  // table → column → nullable
  const db = new Map<string, Map<string, boolean>>();
  for (const r of rows) {
    if (IGNORED_TABLES.has(r.table_name)) continue;
    if (!db.has(r.table_name)) db.set(r.table_name, new Map());
    db.get(r.table_name)!.set(r.column_name, r.is_nullable === 'YES');
  }

  const problems: string[] = [];
  const prismaTables = new Set<string>();

  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName ?? model.name;
    prismaTables.add(table);
    const columns = db.get(table);
    if (!columns) {
      problems.push(`table "${table}" (model ${model.name}) is in schema.prisma but no migration creates it`);
      continue;
    }

    const prismaColumns = new Set<string>();
    for (const field of model.fields) {
      if (field.kind === 'object') continue; // relation fields have no column
      const column = field.dbName ?? field.name;
      prismaColumns.add(column);
      if (!columns.has(column)) {
        problems.push(`column "${table}.${column}" (${model.name}.${field.name}) is in schema.prisma but not in the database`);
        continue;
      }
      const dbNullable = columns.get(column)!;
      if (dbNullable === field.isRequired) {
        problems.push(
          `column "${table}.${column}" is ${dbNullable ? 'NULL' : 'NOT NULL'} in the database but ` +
            `${field.isRequired ? 'required' : 'optional'} in schema.prisma`,
        );
      }
    }
    for (const column of columns.keys()) {
      if (!prismaColumns.has(column)) {
        problems.push(`column "${table}.${column}" exists in the database but not in schema.prisma (model ${model.name})`);
      }
    }
  }

  for (const table of db.keys()) {
    if (!prismaTables.has(table)) problems.push(`table "${table}" exists in the database but not in schema.prisma`);
  }

  if (problems.length > 0) {
    console.error(`Schema drift found (${problems.length}):\n` + problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
  }
  console.log(`No schema drift: ${prismaTables.size} tables match schema.prisma.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
