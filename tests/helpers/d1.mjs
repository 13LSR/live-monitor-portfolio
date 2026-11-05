import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function createTestDatabase(t) {
  const db = new DatabaseSync(":memory:");
  const directory = join(process.cwd(), "worker/migrations");
  for (const name of readdirSync(directory).filter((file) => file.endsWith(".sql")).sort()) {
    db.exec(readFileSync(join(directory, name), "utf8"));
  }
  t.after(() => db.close());
  return {
    db,
    binding: {
      prepare(sql) { return statement(sql); },
      async batch(statements) {
        db.exec("BEGIN");
        try {
          const results = statements.map((item) => item.execute());
          db.exec("COMMIT");
          return results;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
  };

  function statement(sql, params = []) {
    return {
      bind(...values) { return statement(sql, values); },
      execute() { return { success: true, results: db.prepare(sql).all(...params) }; },
      async all() { return this.execute(); },
      async first() { return db.prepare(sql).get(...params) ?? null; },
      async run() { return { success: true, meta: db.prepare(sql).run(...params) }; },
    };
  }
}
