import os
import re

file_path = r"C:\Users\ayush\OneDrive\Documents\Projects\yor-talksv2-main\lib\db\src\schema\index.ts"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace pg imports with sqlite
code = code.replace(
    'import { pgTable, text, uuid, timestamp, boolean, jsonb, index, uniqueIndex, integer } from "drizzle-orm/pg-core";',
    'import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";'
)

# Convert specific pg column types to sqlite equivalents
code = code.replace("pgTable(", "sqliteTable(")
code = code.replace('uuid(', 'text(')
code = code.replace('timestamp(', 'text(')
code = code.replace('jsonb(', 'text({ mode: "json" })(') # JSON mode in sqlite requires text({mode: 'json'})
code = code.replace('boolean(', 'integer({ mode: "boolean" })(')

# mode: "string" is not valid in text() like it was in timestamp(). We need to fix timestamp("...", { mode: "string" })
# Wait, for sqlite, text() is natively strings. We just replace text({ mode: "string" }) with text()
# Or rather timestamp("created_at", { mode: "string" }) -> text("created_at")
code = re.sub(r'timestamp\("([^"]+)", \{ mode: "string" \}\)', r'text("\1")', code)
code = re.sub(r'timestamp\("([^"]+)"\)', r'text("\1")', code)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Schema converted to SQLite successfully.")
