import os
import sqlite3
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "..", "data", "royal_enfield.db")


def get_conn():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(
            "Database not found. Run `python -m app.ingest` from the backend/ "
            "directory first to build royal_enfield.db from the workbook."
        )
    conn = sqlite3.connect(DB_PATH)
    return conn


def query_df(sql: str, params: tuple = ()) -> pd.DataFrame:
    conn = get_conn()
    try:
        return pd.read_sql_query(sql, conn, params=params)
    finally:
        conn.close()


def table_df(table: str) -> pd.DataFrame:
    return query_df(f"SELECT * FROM {table}")
