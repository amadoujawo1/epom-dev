import sqlite3
con = sqlite3.connect('epom_dev.db')
cur = con.cursor()
rows = list(cur.execute("PRAGMA table_info(personnel)"))
for r in rows:
    print(r)
con.close()
