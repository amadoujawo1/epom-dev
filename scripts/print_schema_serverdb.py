import sqlite3
p='server/instance/epom_dev.db'
con=sqlite3.connect(p)
cur=con.cursor()
row=cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='personnel'").fetchone()
print(row[0] if row else 'NO TABLE')
con.close()
