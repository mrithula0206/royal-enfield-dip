from fastapi import APIRouter, Query
from typing import Optional
from ..logic import load_leads, compute_kpis

router = APIRouter(prefix="/api/kpis", tags=["KPIs"])


@router.get("")
def get_kpis(
    start: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end: Optional[str] = Query(None, description="YYYY-MM-DD"),
    region: Optional[str] = None,
    model: Optional[str] = None,
    source: Optional[str] = None,
    dealer_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
):
    """Executive KPI strip: Leads, New Leads, Enquiries, Open Enquiries, Bookings,
    Dropped, Retail, Duplicate Leads, E2B%, L2B%, Duplicate%."""
    df = load_leads(start, end, region, model, source, dealer_id, campaign_id)
    return compute_kpis(df)
