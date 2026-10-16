import os
import re
import sqlite3
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_DB_PATH = os.path.join(BASE_DIR, "courier_demo.db")


class SQLiteDictCursor:
    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid = None
        self.rowcount = -1

    def execute(self, query, params=None):
        # Safely convert %s to ? without affecting %Y, %m, etc.
        translated_query = re.sub(r'(?<!%)%s', '?', query)
        if params is None:
            self._cursor.execute(translated_query)
        else:
            clean_params = []
            for p in params:
                if isinstance(p, datetime):
                    clean_params.append(p.strftime("%Y-%m-%d %H:%M:%S"))
                else:
                    clean_params.append(p)
            self._cursor.execute(translated_query, tuple(clean_params))
        self.lastrowid = self._cursor.lastrowid
        self.rowcount = self._cursor.rowcount
        return self

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        cols = [d[0] for d in self._cursor.description]
        return dict(zip(cols, row))

    def fetchall(self):
        rows = self._cursor.fetchall()
        if not rows:
            return []
        cols = [d[0] for d in self._cursor.description]
        return [dict(zip(cols, r)) for r in rows]

    def close(self):
        pass


class SQLiteConnectionWrapper:
    def __init__(self, db_path):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._register_functions()

    def _register_functions(self):
        def date_format(val, fmt="%Y-%m-%d %H:%i"):
            if not val:
                return None
            s = str(val).replace("T", " ")
            return s[:16] if len(s) >= 16 else s

        self._conn.create_function("DATE_FORMAT", 2, date_format)
        self._conn.create_function("NOW", 0, lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        self._conn.create_function("CONCAT", -1, lambda *args: "".join(str(a) for a in args if a is not None))

    def cursor(self, dictionary=True):
        return SQLiteDictCursor(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        try:
            self._conn.close()
        except Exception:
            pass


def get_db_connection():
    host = os.getenv("DB_HOST")
    # Only try MySQL if DB_HOST is set and not empty
    if host:
        try:
            import mysql.connector
            # Connect with short timeout to prevent serverless function hangs
            return mysql.connector.connect(
                host=host,
                port=int(os.getenv("DB_PORT", 3306)),
                user=os.getenv("DB_USER", "root"),
                password=os.getenv("DB_PASSWORD", ""),
                database=os.getenv("DB_NAME", "courier_management"),
                connection_timeout=2
            )
        except Exception as err:
            print(f"[DB Notice] MySQL connection failed ({err}), falling back to demo store.")

    # Fallback to embedded SQLite demo database
    if os.path.exists(SQLITE_DB_PATH):
        return SQLiteConnectionWrapper(SQLITE_DB_PATH)

    raise RuntimeError("No database available: MySQL connection failed and courier_demo.db not found.")
