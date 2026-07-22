from fastapi import APIRouter
from ..db import table_df

router = APIRouter(prefix="/api/affiliate", tags=["Affiliate Payout"])


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
