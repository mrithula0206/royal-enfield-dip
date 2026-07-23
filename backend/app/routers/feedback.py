from fastapi import APIRouter
import pandas as pd
from ..db import table_df

router = APIRouter(prefix="/api/feedback", tags=["Customer Feedback"])


def _nps_category(score):
    if score >= 9:
        return "Promoter"
    if score >= 7:
        return "Passive"
    return "Detractor"


@router.get("/summary")
def summary():
    """Overall NPS (promoter% - detractor%), complaint rate, and complaint category mix."""
    df = table_df("customer_feedback")
    df["Category"] = df["NPS_Score"].apply(_nps_category)
    total = len(df)
    promoters = (df.Category == "Promoter").sum()
    detractors = (df.Category == "Detractor").sum()
    nps = round(((promoters - detractors) / total) * 100, 1) if total else 0

    complaints = df[df.Complaint_Flag == "Yes"]
    complaint_cat = complaints.groupby("Complaint_Category").size().reset_index(name="Count").sort_values("Count", ascending=False)

    return {
        "responses": int(total),
        "avg_nps_score": round(float(df["NPS_Score"].mean()), 2) if total else 0,
        "nps": nps,
        "promoter_pct": round(promoters / total, 4) if total else 0,
        "passive_pct": round((df.Category == "Passive").sum() / total, 4) if total else 0,
        "detractor_pct": round(detractors / total, 4) if total else 0,
        "complaint_rate": round(len(complaints) / total, 4) if total else 0,
        "complaints_by_category": complaint_cat.to_dict(orient="records"),
    }


@router.get("/by-region")
def by_region():
    """Region-wise NPS and complaint rate rollup."""
    df = table_df("customer_feedback")
    df["Category"] = df["NPS_Score"].apply(_nps_category)
    grp = df.groupby("Region").agg(
        Responses=("Feedback_ID", "count"),
        Avg_NPS=("NPS_Score", "mean"),
        Promoters=("Category", lambda s: (s == "Promoter").sum()),
        Detractors=("Category", lambda s: (s == "Detractor").sum()),
        Complaints=("Complaint_Flag", lambda s: (s == "Yes").sum()),
    ).reset_index()
    grp["NPS"] = ((grp["Promoters"] - grp["Detractors"]) / grp["Responses"] * 100).round(1)
    grp["Avg_NPS"] = grp["Avg_NPS"].round(2)
    grp["Complaint_Rate"] = (grp["Complaints"] / grp["Responses"]).round(4)
    return {"rows": grp.sort_values("NPS", ascending=False).to_dict(orient="records")}


@router.get("/satisfaction-impact")
def satisfaction_impact():
    """Correlates each dealer's complaint rate against its lead->booking leakage rate —
    an honest proxy for 'does poor service correlate with lost business', since there's
    no direct satisfaction-to-future-purchase link in the data."""
    fb = table_df("customer_feedback")
    fb_grp = fb.groupby("Dealer_ID").agg(
        Responses=("Feedback_ID", "count"),
        Complaints=("Complaint_Flag", lambda s: (s == "Yes").sum()),
    ).reset_index()
    fb_grp["Complaint_Rate"] = (fb_grp["Complaints"] / fb_grp["Responses"]).round(4)

    leads = table_df("leads")
    leads_grp = leads.groupby("Dealer_ID").agg(
        Leads=("Lead_ID", "count"),
        Bookings=("Lead_Status", lambda s: (s == "Booked").sum()),
    ).reset_index()
    leads_grp["Leakage_pct"] = (1 - leads_grp["Bookings"] / leads_grp["Leads"]).round(4)

    merged = fb_grp.merge(leads_grp, on="Dealer_ID", how="inner")
    merged = merged[merged.Responses >= 3]

    dealers = table_df("dealer_master")[["Dealer_ID", "Dealer_Name", "Tier"]]
    merged = merged.merge(dealers, on="Dealer_ID", how="left")

    raw_corr = merged["Complaint_Rate"].corr(merged["Leakage_pct"]) if len(merged) > 2 else None
    correlation = round(float(raw_corr), 3) if raw_corr is not None and not pd.isna(raw_corr) else None
    return {
        "correlation_complaint_vs_leakage": correlation,
        "rows": merged.sort_values("Complaint_Rate", ascending=False).to_dict(orient="records"),
    }


@router.get("/by-dealer")
def by_dealer():
    """Dealer-level NPS leaderboard with complaint rate, joined with tier/region."""
    df = table_df("customer_feedback")
    df["Category"] = df["NPS_Score"].apply(_nps_category)
    grp = df.groupby("Dealer_ID").agg(
        Responses=("Feedback_ID", "count"),
        Avg_NPS=("NPS_Score", "mean"),
        Promoters=("Category", lambda s: (s == "Promoter").sum()),
        Detractors=("Category", lambda s: (s == "Detractor").sum()),
        Complaints=("Complaint_Flag", lambda s: (s == "Yes").sum()),
    ).reset_index()
    grp["NPS"] = ((grp["Promoters"] - grp["Detractors"]) / grp["Responses"] * 100).round(1)
    grp["Avg_NPS"] = grp["Avg_NPS"].round(2)
    grp["Complaint_Rate"] = (grp["Complaints"] / grp["Responses"]).round(4)

    dealers = table_df("dealer_master")[["Dealer_ID", "Dealer_Name", "Tier", "Region"]]
    grp = grp.merge(dealers, on="Dealer_ID", how="left")
    return {"rows": grp.sort_values("NPS", ascending=False).to_dict(orient="records")}
