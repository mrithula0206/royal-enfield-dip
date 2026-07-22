"""
Ingest the Royal Enfield Digital Intelligence workbook into SQLite.

Run once (or whenever the source workbook changes):
    python -m app.ingest

This mirrors every sheet in the workbook into a same-named SQLite table.
Downstream routers query these tables directly with pandas.
"""
import os
import sqlite3
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "data")
XLSX_PATH = os.path.join(DATA_DIR, "Royal_Enfield_Digital_Intelligence_Platform.xlsx")
DB_PATH = os.path.join(DATA_DIR, "royal_enfield.db")

SHEET_TABLE_MAP = {
    "Leads": "leads",
    "Lead_History": "lead_history",
    "Region_Master": "region_master",
    "Dealer_Master": "dealer_master",
    "Model_Master": "model_master",
    "Source_Master": "source_master",
    "Campaign_Master": "campaign_master",
    "Campaign_Hygiene": "campaign_hygiene",
    "Targets_Region": "targets_region",
    "Targets_Model": "targets_model",
    "Targets_Source": "targets_source",
    "WalkIn_Telephonic_Region": "walkin_telephonic_region",
    "Lead_Status_Master": "lead_status_master",
    "Campaign_Status_Master": "campaign_status_master",
    "AI_Insights": "ai_insights",
    "Daily_Report": "daily_report",
    "Call_Log": "call_log",
    "Follow_Up": "follow_up",
    "Customer_Feedback": "customer_feedback",
    "Ad_Performance": "ad_performance",
    "Offline_Channel_Performance": "offline_channel_performance",
    "Affiliate_Payout": "affiliate_payout",
}

DATE_COLUMNS = {
    "leads": ["Created_Date", "Enquiry_Date", "Booking_Date", "Drop_Date"],
    "lead_history": ["Event_Date"],
    "campaign_master": ["Campaign_Start_Date", "Campaign_End_Date"],
    "campaign_hygiene": ["Date"],
    "ai_insights": ["Generated_Date"],
    "daily_report": ["Date"],
    "call_log": ["Call_Date"],
    "follow_up": ["Scheduled_Date", "Completed_Date"],
    "customer_feedback": ["Feedback_Date"],
    "ad_performance": ["Date"],
    "offline_channel_performance": ["Date"],
}


def run_ingest():
    if not os.path.exists(XLSX_PATH):
        raise FileNotFoundError(
            f"Workbook not found at {XLSX_PATH}. Place the .xlsx file in backend/data/."
        )

    conn = sqlite3.connect(DB_PATH)
    xls = pd.ExcelFile(XLSX_PATH)

    for sheet, table in SHEET_TABLE_MAP.items():
        if sheet not in xls.sheet_names:
            print(f"WARNING: sheet '{sheet}' not found in workbook, skipping.")
            continue
        df = pd.read_excel(xls, sheet_name=sheet)

        # normalise date columns to ISO strings for reliable SQLite comparisons
        for col in DATE_COLUMNS.get(table, []):
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce").dt.strftime("%Y-%m-%d")

        df.to_sql(table, conn, if_exists="replace", index=False)
        print(f"Loaded {sheet:30s} -> {table:28s} ({len(df):,} rows)")

    # helpful indexes for the columns we filter/join on most
    cur = conn.cursor()
    index_stmts = [
        "CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(Created_Date)",
        "CREATE INDEX IF NOT EXISTS idx_leads_region ON leads(Region)",
        "CREATE INDEX IF NOT EXISTS idx_leads_dealer ON leads(Dealer_ID)",
        "CREATE INDEX IF NOT EXISTS idx_leads_model ON leads(Model)",
        "CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(Source)",
        "CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(Campaign_ID)",
        "CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(Lead_Status)",
        "CREATE INDEX IF NOT EXISTS idx_history_lead ON lead_history(Lead_ID)",
        "CREATE INDEX IF NOT EXISTS idx_hygiene_campaign ON campaign_hygiene(Campaign_ID)",
        "CREATE INDEX IF NOT EXISTS idx_hygiene_date ON campaign_hygiene(Date)",
        "CREATE INDEX IF NOT EXISTS idx_call_lead ON call_log(Lead_ID)",
        "CREATE INDEX IF NOT EXISTS idx_call_date ON call_log(Call_Date)",
        "CREATE INDEX IF NOT EXISTS idx_call_dealer ON call_log(Dealer_ID)",
        "CREATE INDEX IF NOT EXISTS idx_followup_lead ON follow_up(Lead_ID)",
        "CREATE INDEX IF NOT EXISTS idx_feedback_dealer ON customer_feedback(Dealer_ID)",
        "CREATE INDEX IF NOT EXISTS idx_feedback_date ON customer_feedback(Feedback_Date)",
        "CREATE INDEX IF NOT EXISTS idx_ad_date ON ad_performance(Date)",
        "CREATE INDEX IF NOT EXISTS idx_ad_source ON ad_performance(Source)",
        "CREATE INDEX IF NOT EXISTS idx_offline_date ON offline_channel_performance(Date)",
        "CREATE INDEX IF NOT EXISTS idx_offline_region ON offline_channel_performance(Region)",
    ]
    for stmt in index_stmts:
        cur.execute(stmt)
    conn.commit()
    conn.close()
    print(f"\nSQLite database written to {DB_PATH}")


if __name__ == "__main__":
    run_ingest()
