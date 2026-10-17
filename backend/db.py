import os
import re
import shutil
import sqlite3
import stat
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_DB_PATH = os.path.join(BASE_DIR, "courier_demo.db")


def get_sqlite_db_path():
    """
    Returns a writable path for the SQLite demo database.
    On serverless platforms (e.g. Vercel, AWS Lambda), the deployment root (/var/task)
    is strictly read-only. We copy courier_demo.db to /tmp so that write operations
    (booking parcels, updating shipments, recording payments) succeed.
    """
    if not os.path.exists(SQLITE_DB_PATH):
        return None

    is_serverless = bool(
        os.getenv("VERCEL")
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME")
        or "/var/task" in BASE_DIR
    )
    is_writable = os.access(BASE_DIR, os.W_OK) and (
        not os.path.exists(SQLITE_DB_PATH) or os.access(SQLITE_DB_PATH, os.W_OK)
    )

    if not is_writable or is_serverless:
        tmp_db_path = "/tmp/courier_demo.db"
        try:
            if not os.path.exists(tmp_db_path) or os.path.getsize(tmp_db_path) == 0:
                shutil.copyfile(SQLITE_DB_PATH, tmp_db_path)
                try:
                    os.chmod(tmp_db_path, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH | stat.S_IWOTH)
                except Exception:
                    pass
            return tmp_db_path
        except Exception as err:
            print(f"[DB Warning] Could not prepare writable database in /tmp ({err}), using seed directly.")
            return SQLITE_DB_PATH

    return SQLITE_DB_PATH


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
        self._conn = sqlite3.connect(db_path, check_same_thread=False, timeout=15.0)
        try:
            self._conn.execute("PRAGMA busy_timeout = 5000;")
        except Exception:
            pass
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

    # Fallback to embedded SQLite demo database (with writable /tmp support for serverless)
    db_path = get_sqlite_db_path()
    if db_path and os.path.exists(db_path):
        return SQLiteConnectionWrapper(db_path)

    raise RuntimeError("No database available: MySQL connection failed and courier_demo.db not found.")

