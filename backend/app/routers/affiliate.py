from fastapi import APIRouter
from ..db import table_df
from ..logic import load_leads, drilldown

router = APIRouter(prefix="/api/affiliate", tags=["Affiliate Payout"])


@router.get("/performance")
def performance():
    """Affiliate-wise leads/bookings/retail/conversion% from the real lead funnel,
    joined with payout economics for a spend-vs-output comparison."""
    sources = table_df("source_master")
    aff_sources = sources[sources.Source_Category == "Affiliate"]["Source"].tolist()

    df = load_leads()
    df = df[df.Source.isin(aff_sources)]
    funnel_rows = {r["Source"]: r for r in drilldown(df, "Source")}

    payout = table_df("affiliate_payout").groupby("Affiliate_Source").agg(
        Amount_Payable=("Amount_Payable", "sum"), Amount_Paid=("Amount_Paid", "sum"),
    ).reset_index()
    payout_map = payout.set_index("Affiliate_Source").to_dict(orient="index")

    rows = []
    for src in aff_sources:
        f = funnel_rows.get(src, {"Leads": 0, "Bookings": 0, "Retail": 0, "L2B_pct": 0, "B2R_pct": 0})
        p = payout_map.get(src, {"Amount_Payable": 0, "Amount_Paid": 0})
        bookings_per_1000 = round(f["Bookings"] / p["Amount_Payable"] * 1000, 3) if p["Amount_Payable"] else 0
        rows.append({
            "Affiliate_Source": src, "Leads": f["Leads"], "Bookings": f["Bookings"], "Retail": f["Retail"],
            "L2B_pct": f["L2B_pct"], "B2R_pct": f.get("B2R_pct", 0),
            "Amount_Payable": p["Amount_Payable"], "Amount_Paid": p["Amount_Paid"],
            "Bookings_Per_1000_Spend": bookings_per_1000,
        })
    rows.sort(key=lambda r: r["Leads"], reverse=True)
    return {"rows": rows}


@router.get("/summary")
def summary():
    """Affiliate lead-gen partner financials: payable / paid / receivable by source, with payment status mix."""
    df = table_df("affiliate_payout")
    grp = df.groupby("Affiliate_Source").agg(
        Leads_Delivered=("Leads_Delivered", "sum"), Amount_Payable=("Amount_Payable", "sum"),
        Amount_Paid=("Amount_Paid", "sum"), Amount_Receivable=("Amount_Receivable", "sum"),
    ).reset_index()
    grp["CPL_Rate"] = (grp["Amount_Payable"] / grp["Leads_Delivered"]).round(2)

    totals = {
        "leads_delivered": int(df["Leads_Delivered"].sum()),
        "amount_payable": round(float(df["Amount_Payable"].sum()), 2),
        "amount_paid": round(float(df["Amount_Paid"].sum()), 2),
        "amount_receivable": round(float(df["Amount_Receivable"].sum()), 2),
    }
    status_mix = df.groupby("Payment_Status").size().reset_index(name="Count")

    return {
        "totals": totals,
        "by_source": grp.sort_values("Amount_Payable", ascending=False).to_dict(orient="records"),
        "status_mix": status_mix.to_dict(orient="records"),
    }


@router.get("/by-month")
def by_month():
    """Monthly affiliate spend trend across all partners."""
    df = table_df("affiliate_payout")
    grp = df.groupby("Month").agg(
        Leads_Delivered=("Leads_Delivered", "sum"), Amount_Payable=("Amount_Payable", "sum"),
        Amount_Paid=("Amount_Paid", "sum"), Amount_Receivable=("Amount_Receivable", "sum"),
    ).reset_index()
    return {"rows": grp.to_dict(orient="records")}
