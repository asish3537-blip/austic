import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

function splitStatements(source) {
  const statements = [];
  let start = 0;
  let index = 0;
  let quote = null;
  let dollarQuote = null;
  let lineComment = false;
  let blockComment = false;

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === "\n") lineComment = false;
      index += 1;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 2;
      } else index += 1;
      continue;
    }
    if (dollarQuote) {
      if (source.startsWith(dollarQuote, index)) {
        index += dollarQuote.length;
        dollarQuote = null;
      } else index += 1;
      continue;
    }
    if (quote) {
      if (character === quote && next === quote) index += 2;
      else {
        if (character === quote) quote = null;
        index += 1;
      }
      continue;
    }

    if (character === "-" && next === "-") {
      lineComment = true;
      index += 2;
    } else if (character === "/" && next === "*") {
      blockComment = true;
      index += 2;
    } else if (character === "'" || character === '"') {
      quote = character;
      index += 1;
    } else if (character === "$") {
      const match = source.slice(index).match(/^\$[a-zA-Z_0-9]*\$/);
      if (match) {
        dollarQuote = match[0];
        index += dollarQuote.length;
      } else index += 1;
    } else if (character === ";") {
      const statement = source.slice(start, index + 1).trim();
      if (statement) statements.push(statement);
      start = index + 1;
      index += 1;
    } else index += 1;
  }

  const remaining = source.slice(start).trim();
  if (remaining) statements.push(remaining);
  return statements;
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Run this through `vercel env run` for Production.");
  process.exit(1);
}

try {
  const source = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  const statements = splitStatements(source);
  const sql = neon(process.env.DATABASE_URL);
  await sql.transaction(statements.map(statement => sql.query(statement)));
  const [health] = await sql`
    SELECT to_regclass('public.paustik_deliveries') IS NOT NULL AS schema_ready
  `;
  if (!health?.schema_ready) throw new Error("schema verification failed");
  console.log(`Applied and verified ${statements.length} Paustik database statements.`);
} catch (error) {
  const message = String(error?.message || "").replace(/(?:postgres(?:ql)?:\/\/)[^\s"']+/gi, "[connection string hidden]");
  console.error(`Schema setup failed (${error?.name || "Error"}): ${message.slice(0, 400)}`);
  process.exitCode = 1;
}
