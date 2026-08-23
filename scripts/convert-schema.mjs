import fs from 'fs';
import path from 'path';

const file_path = path.join(process.cwd(), 'lib', 'db', 'src', 'schema', 'index.ts');
let code = fs.readFileSync(file_path, 'utf-8');

code = code.replace(
    'import { pgTable, text, uuid, timestamp, boolean, jsonb, index, uniqueIndex, integer } from "drizzle-orm/pg-core";',
    'import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";'
);

code = code.replace(/pgTable\(/g, "sqliteTable(");
code = code.replace(/uuid\(/g, 'text(');
code = code.replace(/jsonb\(/g, 'text({ mode: "json" })(');
code = code.replace(/boolean\(/g, 'integer({ mode: "boolean" })(');

code = code.replace(/timestamp\("([^"]+)", \{ mode: "string" \}\)/g, 'text("$1")');
code = code.replace(/timestamp\("([^"]+)"\)/g, 'text("$1")');

fs.writeFileSync(file_path, code, 'utf-8');
console.log("Schema converted to SQLite successfully.");
