import sqlite3, os
paths = ['epom_dev.db','instance/epom_dev.db','server/instance/epom_dev.db']
for p in paths:
    print('---', p, '---')
    if not os.path.exists(p):
        print('MISSING')
        continue
    try:
        con=sqlite3.connect(p)
        cur=con.cursor()
        row=cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='personnel'").fetchone()
        if row:
            print(row[0])
        else:
            print('NO personnel table')
        con.close()
    except Exception as e:
        print('ERROR', e)
