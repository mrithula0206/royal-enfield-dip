"""
Core funnel / KPI business logic, shared by every router.

Funnel definitions (per product spec):
    Leads = New Leads + Enquiries
    Enquiries = Open Enquiries + Bookings + Dropped
    Retail = Booked vehicle delivered to customer (Retail_Status == 'Delivered')

    E2B% = Bookings / Enquiries
    L2B% = Bookings / Leads
"""
import pandas as pd
from .db import table_df, query_df

LEAD_COLS_SQL = "Lead_ID,Created_Date,Month,Region,Dealer_ID,Model,Source,Campaign_ID," \
                 "Lead_Status,Enquiry_Flag,Booking_Flag,Dropped_Flag,Duplicate_Flag," \
                 "Retail_Status,Lead_Age_Days"


def load_leads(start: str = None, end: str = None, region: str = None, model: str = None,
               source: str = None, dealer_id: str = None, campaign_id: str = None) -> pd.DataFrame:
    """Load the Leads table with optional filters. Dates are ISO 'YYYY-MM-DD' strings."""
    where = []
    params = []
    if start:
        where.append("Created_Date >= ?")
        params.append(start)
    if end:
        where.append("Created_Date <= ?")
        params.append(end)
    if region:
        where.append("Region = ?")
        params.append(region)
    if model:
        where.append("Model = ?")
        params.append(model)
    if source:
        where.append("Source = ?")
        params.append(source)
    if dealer_id:
        where.append("Dealer_ID = ?")
        params.append(dealer_id)
    if campaign_id:
        where.append("Campaign_ID = ?")
        params.append(campaign_id)

    sql = f"SELECT {LEAD_COLS_SQL} FROM leads"
    if where:
        sql += " WHERE " + " AND ".join(where)
    return query_df(sql, tuple(params))


def compute_kpis(df: pd.DataFrame) -> dict:
    leads = len(df)
    new_leads = int((df.Lead_Status == "New Lead").sum())
    enquiries = int(leads - new_leads)  # Enquiries = Leads - New Leads, per spec
    open_enq = int((df.Lead_Status == "Open Enquiry").sum())
    bookings = int((df.Lead_Status == "Booked").sum())
    dropped = int((df.Lead_Status == "Dropped").sum())
    retail = int((df.Retail_Status == "Delivered").sum())
    duplicate_leads = int((df.Duplicate_Flag == "Yes").sum())

    e2b = round(bookings / enquiries, 4) if enquiries else 0.0
    l2b = round(bookings / leads, 4) if leads else 0.0
    l2e = round(enquiries / leads, 4) if leads else 0.0
    b2r = round(retail / bookings, 4) if bookings else 0.0
    dup_pct = round(duplicate_leads / leads, 4) if leads else 0.0

    return {
        "Leads": leads,
        "New_Leads": new_leads,
        "Enquiries": enquiries,
        "Open_Enquiries": open_enq,
        "Bookings": bookings,
        "Dropped": dropped,
        "Retail": retail,
        "Duplicate_Leads": duplicate_leads,
        "E2B_pct": e2b,
        "L2B_pct": l2b,
        "L2E_pct": l2e,
        "B2R_pct": b2r,
        "Duplicate_pct": dup_pct,
    }


def pct_delta(current: float, previous: float) -> float:
    if previous in (0, None):
        return None
    return round((current - previous) / previous, 4)


def kpi_deltas(current: dict, previous: dict) -> dict:
    """Delta for every numeric KPI: percent change for counts, point change for ratios."""
    out = {}
    ratio_keys = {"E2B_pct", "L2B_pct", "L2E_pct", "B2R_pct", "Duplicate_pct"}
    for k in current:
        if k in ratio_keys:
            out[k] = round((current[k] - previous[k]) * 100, 2) if previous.get(k) is not None else None
            out[k + "_unit"] = "pts"
        else:
            out[k] = pct_delta(current[k], previous.get(k))
            out[k + "_unit"] = "pct"
    return out


def drilldown(df: pd.DataFrame, by: str) -> list:
    """Group leads by a dimension (Region / Dealer_ID / Model / Source / Campaign_ID)
    and compute the funnel KPIs for each group."""
    if by not in df.columns:
        raise ValueError(f"Cannot drill down by unknown column '{by}'")
    rows = []
    for key, g in df.groupby(by):
        k = compute_kpis(g)
        k[by] = key
        rows.append(k)
    rows.sort(key=lambda r: r["Leads"], reverse=True)
    return rows


def top_bottom(df: pd.DataFrame, by: str, metric: str = "L2B_pct", n: int = 10,
               min_leads: int = 0):
    rows = drilldown(df, by)
    rows = [r for r in rows if r["Leads"] >= min_leads]
    rows_sorted = sorted(rows, key=lambda r: r[metric], reverse=True)
    return {
        "top": rows_sorted[:n],
        "bottom": list(reversed(rows_sorted[-n:])) if len(rows_sorted) >= n else list(reversed(rows_sorted)),
    }


def month_bounds(month: str):
    """month: 'May-2026' or 'Jun-2026' -> (start_iso, end_iso)"""
    period = pd.Period(month, freq="M")
    return period.start_time.strftime("%Y-%m-%d"), period.end_time.strftime("%Y-%m-%d")
