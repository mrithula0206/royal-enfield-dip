from fastapi import APIRouter
import pandas as pd
from ..db import table_df

router = APIRouter(prefix="/api/ad-performance", tags=["Ad Performance"])


def _with_derived(df):
    df = df.copy()
    df["CTR"] = (df["Clicks"] / df["Impressions"]).round(4)
    df["CPC"] = (df["Spend"] / df["Clicks"]).round(2)
    df["CPL"] = df.apply(lambda r: round(r["Spend"] / r["Leads_Generated"], 2) if r["Leads_Generated"] else 0, axis=1)
    df["L2B_pct"] = df.apply(lambda r: round(r["Bookings_Generated"] / r["Leads_Generated"], 4) if r["Leads_Generated"] else 0, axis=1)
    return df


@router.get("/summary")
def summary():
    """Spend / clicks / leads / bookings by channel (Search split into Brand vs Generic), with CTR/CPC/CPL/L2B%."""
    df = table_df("ad_performance")
    df["Channel"] = df.apply(lambda r: f"{r['Source']} ({r['Search_Type']})" if pd.notna(r["Search_Type"]) else r["Source"], axis=1)
    grp = df.groupby("Channel").agg(
        Impressions=("Impressions", "sum"), Clicks=("Clicks", "sum"), Spend=("Spend", "sum"),
        Leads_Generated=("Leads_Generated", "sum"), Bookings_Generated=("Bookings_Generated", "sum"),
    ).reset_index()
    grp = _with_derived(grp)

    totals = {
        "impressions": int(df["Impressions"].sum()), "clicks": int(df["Clicks"].sum()),
        "spend": round(float(df["Spend"].sum()), 2), "leads": int(df["Leads_Generated"].sum()),
        "bookings": int(df["Bookings_Generated"].sum()),
    }
    totals["blended_cpl"] = round(totals["spend"] / totals["leads"], 2) if totals["leads"] else 0
    totals["blended_l2b_pct"] = round(totals["bookings"] / totals["leads"], 4) if totals["leads"] else 0

    return {"totals": totals, "by_channel": grp.sort_values("Spend", ascending=False).to_dict(orient="records")}


@router.get("/trend")
def trend(days: int = 61):
    """Daily spend / leads / bookings trend across all paid channels."""
    df = table_df("ad_performance")
    grp = df.groupby("Date").agg(
        Spend=("Spend", "sum"), Leads_Generated=("Leads_Generated", "sum"), Bookings_Generated=("Bookings_Generated", "sum"),
    ).reset_index().sort_values("Date").tail(days)
    return {"points": grp.to_dict(orient="records")}


@router.get("/search-split")
def search_split():
    """Brand vs Generic Google Search performance comparison."""
    df = table_df("ad_performance")
    search = df[df.Source == "Google Search"]
    grp = search.groupby("Search_Type").agg(
        Impressions=("Impressions", "sum"), Clicks=("Clicks", "sum"), Spend=("Spend", "sum"),
        Leads_Generated=("Leads_Generated", "sum"), Bookings_Generated=("Bookings_Generated", "sum"),
    ).reset_index()
    grp = _with_derived(grp)
    return {"rows": grp.to_dict(orient="records")}
