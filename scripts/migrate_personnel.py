import sqlite3
p='server/instance/epom_dev.db'
con=sqlite3.connect(p)
cur=con.cursor()
cols=[r[1] for r in cur.execute("PRAGMA table_info(personnel)")]
print('Existing columns:', cols)
# Define desired columns and SQL to add
adds=[
    ("email", "VARCHAR(120)"),
    ("phone", "VARCHAR(20)"),
    ("status", "VARCHAR(50) DEFAULT 'Active'"),
    ("hire_date", "DATETIME")
]
for name, sqltype in adds:
    if name not in cols:
        print('Adding column', name)
        cur.execute(f"ALTER TABLE personnel ADD COLUMN {name} {sqltype}")
    else:
        print('Already has', name)
con.commit()
# show new schema
row=cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='personnel'").fetchone()
print('New CREATE:', row[0])
con.close()
