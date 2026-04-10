import sqlite3
c = sqlite3.connect("projects/.arcreel.db")
tables = c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("Tables:", tables)

for (table_name,) in tables:
    print(f"\n--- {table_name} ---")
    try:
        rows = c.execute(f"SELECT * FROM {table_name} limit 5").fetchall()
        for r in rows: print(r)
    except:
        pass
