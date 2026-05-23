import sqlite3
con = sqlite3.connect('epom_dev.db')
cur = con.cursor()
row = cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='personnel'").fetchone()
print(row[0] if row else 'NO TABLE')
con.close()
