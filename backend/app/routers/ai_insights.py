from fastapi import APIRouter, Query
from typing import Optional
import pandas as pd
from ..db import table_df
from ..logic import load_leads

router = APIRouter(prefix="/api/ai-insights", tags=["AI Daily Summary"])


@router.get("")
def list_insights(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
):
    df = table_df("ai_insights")
    if category:
        df = df[df.Category == category]
    if severity:
        df = df[df.Severity == severity]
    df = df.sort_values("Insight_ID").head(limit)
    return {"count": len(df), "insights": df.to_dict(orient="records")}


@router.get("/categories")
def categories():
    df = table_df("ai_insights")
    return sorted(df.Category.unique().tolist())


@router.post("/generate")
def generate_insights(as_of: Optional[str] = Query(None, description="YYYY-MM-DD; defaults to latest data date")):
    """Rule-based generator that re-derives insights live from current data,
    the same logic a scheduled nightly job would run. Returns fresh insights
    without persisting them (persistence is left to the caller / a cron job)."""
    leads = table_df("leads")
    targets_region = table_df("targets_region")
    hygiene = table_df("campaign_hygiene")
    campaign_master = table_df("campaign_master")
    source_master = table_df("source_master")

    insights = []

    def add(text, category, severity):
        insights.append({
            "Insight_ID": f"GEN{len(insights)+1:03d}",
            "Category": category,
            "Severity": severity,
            "Insight_Text": text,
        })

    # Region target achievement
    region_leads = leads.groupby("Region").size()
    region_bookings = leads[leads.Lead_Status == "Booked"].groupby("Region").size()
    tr = targets_region.set_index("Region")
    for r in tr.index:
        al, ab = region_leads.get(r, 0), region_bookings.get(r, 0)
        lt, bt = tr.loc[r, "Lead_Target"], tr.loc[r, "Booking_Target"]
        lead_ach = al / lt if lt else 0
        book_ach = ab / bt if bt else 0
        if lead_ach >= 1.0 and book_ach < 0.90:
            add(f"{r} achieved lead targets ({lead_ach:.0%}) but missed booking targets "
                f"({book_ach:.0%}) due to low E2B conversion.", "Target Performance", "High")

    # Duplicate percentage by affiliate source
    aff = source_master[source_master.Source_Category == "Affiliate"].Source.tolist()
    dup_by_source = leads[leads.Source.isin(aff)].groupby("Source")["Duplicate_Flag"].apply(
        lambda s: (s == "Yes").mean()
    )
    for s, pct in dup_by_source.items():
        if pct >= 0.12:
            add(f"{s} duplicate percentage is elevated at {pct:.1%}, above the 12% threshold.",
                "Data Quality", "High")

    # Campaign hygiene consecutive failures
    for cid in campaign_master.Campaign_ID:
        sub = hygiene[hygiene.Campaign_ID == cid].sort_values("Date").reset_index(drop=True)
        run, max_run = 0, 0
        for v in sub["Overall_Status"]:
            run = run + 1 if v == "Fail" else 0
            max_run = max(max_run, run)
        if max_run >= 3:
            cname = campaign_master.loc[campaign_master.Campaign_ID == cid, "Campaign_Name"].values[0]
            add(f"{cid} ({cname}) experienced hygiene failures for {max_run} consecutive days.",
                "Campaign Hygiene", "High")

    # Model booking target overachievement in South
    leads_with_region_band = leads.merge(table_df("region_master")[["Region", "Zone"]], on="Region", how="left")
    for m in leads.Model.unique():
        sub = leads_with_region_band[(leads_with_region_band.Model == m) & (leads_with_region_band.Zone == "South")]
        bookings = (sub.Lead_Status == "Booked").sum()
        if bookings >= 40:
            add(f"{m} shows strong booking volume in South zone ({int(bookings)} units booked).",
                "Model Performance", "Low")

    return {"generated_count": len(insights), "insights": insights}
