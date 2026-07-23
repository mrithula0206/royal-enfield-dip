from fastapi import APIRouter
from typing import Optional
from ..logic import load_leads, compute_kpis
from ..db import table_df

router = APIRouter(prefix="/api/geography", tags=["Geography Intelligence"])


@router.get("/zone")
def zone_performance(start: Optional[str] = None, end: Optional[str] = None):
    """Leads rolled up from Region to Zone (North/South/East/West/Central)."""
    df = load_leads(start, end)
    region_zone = table_df("region_master").set_index("Region")["Zone"].to_dict()
    df = df.copy()
    df["Zone"] = df["Region"].map(region_zone)
    rows = []
    for zone, g in df.groupby("Zone"):
        k = compute_kpis(g)
        k["Zone"] = zone
        rows.append(k)
    rows.sort(key=lambda r: r["Leads"], reverse=True)
    return {"rows": rows}


@router.get("/city")
def city_performance(start: Optional[str] = None, end: Optional[str] = None):
    """Leads rolled up by each lead's dealer's City (dealer-level geography, not lead-level)."""
    df = load_leads(start, end)
    dealer_city = table_df("dealer_master").set_index("Dealer_ID")["City"].to_dict()
    df = df.copy()
    df["City"] = df["Dealer_ID"].map(dealer_city)
    rows = []
    for city, g in df.groupby("City"):
        k = compute_kpis(g)
        k["City"] = city
        rows.append(k)
    rows.sort(key=lambda r: r["Leads"], reverse=True)
    return {"rows": rows}


@router.get("/city-dealer-leakage")
def city_dealer_leakage(start: Optional[str] = None, end: Optional[str] = None):
    """City-wise dealer leakage: leads that never booked, and bookings that never retailed."""
    df = load_leads(start, end)
    dealers = table_df("dealer_master")[["Dealer_ID", "City"]].set_index("Dealer_ID")["City"].to_dict()
    df = df.copy()
    df["City"] = df["Dealer_ID"].map(dealers)

    rows = []
    for city, g in df.groupby("City"):
        leads = len(g)
        bookings = int((g.Lead_Status == "Booked").sum())
        retail = int((g.Retail_Status == "Delivered").sum())
        lead_no_booking = leads - bookings
        booking_no_retail = bookings - retail
        rows.append({
            "City": city, "Leads": leads, "Bookings": bookings, "Retail": retail,
            "Lead_No_Booking_Leakage": lead_no_booking,
            "Lead_No_Booking_Leakage_pct": round(lead_no_booking / leads, 4) if leads else 0,
            "Booking_No_Retail_Leakage": booking_no_retail,
            "Booking_No_Retail_Leakage_pct": round(booking_no_retail / bookings, 4) if bookings else 0,
        })
    rows.sort(key=lambda r: r["Lead_No_Booking_Leakage_pct"], reverse=True)
    return {"rows": rows}
