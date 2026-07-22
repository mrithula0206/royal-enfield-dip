"""
Extends the demo workbook with 6 new synthetic-but-correlated data domains that the
original workbook didn't cover: call logs, follow-ups, customer feedback/NPS, paid-ad
performance (incl. new channels), offline channel performance, and affiliate payouts.
Also adds a State column to Region_Master.

Everything here is synthetic demo data, generated with realistic correlations to the
REAL Leads table (e.g. Booked leads get more "Connected" calls and faster follow-up;
low-NPS dealers see more complaints) so downstream dashboards show meaningful patterns
instead of pure noise. Run once; re-running overwrites the sheets it adds.
"""
import os
import random
import numpy as np
import pandas as pd
from openpyxl import load_workbook

HERE = os.path.dirname(os.path.abspath(__file__))
XLSX_PATH = os.path.join(HERE, "..", "data", "Royal_Enfield_Digital_Intelligence_Platform.xlsx")

rng = np.random.default_rng(42)
random.seed(42)

STATE_MAP = {
    "Bhopal": "Madhya Pradesh", "Indore": "Madhya Pradesh", "Raipur": "Chhattisgarh", "Jabalpur": "Madhya Pradesh",
    "Kolkata": "West Bengal", "Bhubaneswar": "Odisha", "Patna": "Bihar", "Guwahati": "Assam",
    "Delhi NCR": "Delhi", "Lucknow": "Uttar Pradesh", "Chandigarh": "Punjab", "Jaipur": "Rajasthan", "Dehradun": "Uttarakhand",
    "Chennai": "Tamil Nadu", "Bengaluru": "Karnataka", "Hyderabad": "Telangana", "Coimbatore": "Tamil Nadu",
    "Kochi": "Kerala", "Madurai": "Tamil Nadu", "Visakhapatnam": "Andhra Pradesh",
    "Mumbai": "Maharashtra", "Pune": "Maharashtra", "Ahmedabad": "Gujarat",
}

CALL_OUTCOMES_CONNECTED = ["Connected"]
CALL_OUTCOMES_MISSED = ["No Answer", "Busy", "Voicemail"]

COMPLAINT_CATEGORIES = ["Delivery Delay", "Pricing Dispute", "Service Quality", "Dealer Behaviour", "Vehicle Defect"]


def main():
    print(f"Reading workbook: {XLSX_PATH}")
    leads = pd.read_excel(XLSX_PATH, sheet_name="Leads")
    dealer_master = pd.read_excel(XLSX_PATH, sheet_name="Dealer_Master")
    region_master = pd.read_excel(XLSX_PATH, sheet_name="Region_Master")
    campaign_master = pd.read_excel(XLSX_PATH, sheet_name="Campaign_Master")

    leads["Created_Date"] = pd.to_datetime(leads["Created_Date"])
    date_min, date_max = leads["Created_Date"].min(), leads["Created_Date"].max()
    all_days = pd.date_range(date_min, date_max, freq="D")

    dealer_tier = dealer_master.set_index("Dealer_ID")["Tier"].to_dict()

    # ---------------- 1. Region_Master + State ----------------
    region_master["State"] = region_master["Hub_City"].map(STATE_MAP)
    print(f"Region_Master: added State for {region_master['State'].notna().sum()}/{len(region_master)} regions")

    # ---------------- 2. Call_Log ----------------
    call_rows = []
    call_id = 1
    for _, lead in leads.iterrows():
        status = lead["Lead_Status"]
        if status == "New Lead":
            n_calls = rng.integers(0, 2)
        elif status == "Booked":
            n_calls = rng.integers(1, 4)
        elif status == "Open Enquiry":
            n_calls = rng.integers(1, 4)
        else:  # Dropped
            n_calls = rng.integers(2, 6)

        channel = "Call Center" if lead["Source"] in ("Telephonic",) or (
            lead["Source"] != "Walk-In" and rng.random() < 0.55
        ) else "Dealer"

        for attempt in range(1, n_calls + 1):
            call_date = lead["Created_Date"] + pd.Timedelta(days=int(rng.integers(0, 5)) + attempt - 1)
            if call_date > date_max:
                call_date = date_max

            # connection probability improves for booked leads, worsens for dropped
            connect_p = {"Booked": 0.78, "Open Enquiry": 0.6, "New Lead": 0.5, "Dropped": 0.35}[status]
            connected = rng.random() < connect_p
            outcome = "Connected" if connected else rng.choice(CALL_OUTCOMES_MISSED)
            duration = int(rng.integers(60, 600)) if connected else int(rng.integers(0, 15))

            call_rows.append({
                "Call_ID": f"CALL{call_id:06d}", "Lead_ID": lead["Lead_ID"], "Dealer_ID": lead["Dealer_ID"],
                "Region": lead["Region"], "Channel": channel, "Call_Date": call_date.strftime("%Y-%m-%d"),
                "Attempt_Number": attempt, "Duration_Sec": duration, "Outcome": outcome,
            })
            call_id += 1
    call_log = pd.DataFrame(call_rows)
    print(f"Call_Log: {len(call_log)} rows")

    # ---------------- 3. Follow_Up ----------------
    fu_rows = []
    fu_id = 1
    followable = leads[leads["Enquiry_Flag"] == "Yes"]
    for _, lead in followable.iterrows():
        status = lead["Lead_Status"]
        scheduled = lead["Created_Date"] + pd.Timedelta(days=int(rng.integers(1, 4)))
        if status == "Booked":
            done_p, delay_range = 0.95, (0, 2)
        elif status == "Open Enquiry":
            done_p, delay_range = 0.7, (0, 5)
        else:  # Dropped
            done_p, delay_range = 0.55, (2, 10)

        done = rng.random() < done_p
        if done:
            delay = int(rng.integers(delay_range[0], delay_range[1] + 1))
            completed = scheduled + pd.Timedelta(days=delay)
            fu_status = "Done"
        else:
            delay = None
            completed = None
            fu_status = "Missed" if status != "Open Enquiry" or rng.random() < 0.5 else "Pending"

        fu_rows.append({
            "Follow_Up_ID": f"FU{fu_id:06d}", "Lead_ID": lead["Lead_ID"], "Scheduled_Date": scheduled.strftime("%Y-%m-%d"),
            "Completed_Date": completed.strftime("%Y-%m-%d") if completed is not None else None,
            "Status": fu_status, "Delay_Days": delay,
        })
        fu_id += 1
    follow_up = pd.DataFrame(fu_rows)
    print(f"Follow_Up: {len(follow_up)} rows")

    # ---------------- 4. Customer_Feedback (NPS) ----------------
    fb_rows = []
    fb_id = 1
    retailed = leads[leads["Retail_Status"] == "Delivered"]
    tier_base_nps = {"A": 8.3, "B": 6.8, "C": 5.2}
    for _, lead in retailed.iterrows():
        tier = dealer_tier.get(lead["Dealer_ID"], "B")
        base = tier_base_nps.get(tier, 6.5)
        nps = int(np.clip(round(rng.normal(base, 1.6)), 0, 10))
        complaint = rng.random() < (0.35 if nps <= 6 else 0.06)
        fb_date = lead["Created_Date"] + pd.Timedelta(days=int(rng.integers(20, 60)))
        fb_rows.append({
            "Feedback_ID": f"FB{fb_id:06d}", "Lead_ID": lead["Lead_ID"], "Dealer_ID": lead["Dealer_ID"],
            "Region": lead["Region"], "NPS_Score": nps,
            "Complaint_Flag": "Yes" if complaint else "No",
            "Complaint_Category": (rng.choice(COMPLAINT_CATEGORIES) if complaint else None),
            "Feedback_Date": fb_date.strftime("%Y-%m-%d"),
        })
        fb_id += 1
    customer_feedback = pd.DataFrame(fb_rows)
    print(f"Customer_Feedback: {len(customer_feedback)} rows")

    # ---------------- 5. Ad_Performance ----------------
    # reconcile against REAL leads for channels that already exist; fabricate standalone
    # volume for genuinely new channels (Display / YouTube / Remarketing / Meta Lead Ads).
    daily_real = leads.groupby([leads["Created_Date"].dt.strftime("%Y-%m-%d"), "Source"]).agg(
        Leads=("Lead_ID", "count"), Bookings=("Booking_Flag", lambda s: (s == "Yes").sum())
    ).reset_index().rename(columns={"Created_Date": "Date"})

    # Google Search splits into Brand / Generic (brand converts far better, lower volume)
    search_rows = daily_real[daily_real.Source == "Google Search"].copy()
    ad_rows = []

    def emit_from_leads(source, leads_n, bookings_n, date, search_type=None, ctr=0.02, cpc=18, lead_rate=0.06):
        clicks = max(1, int(round(leads_n / lead_rate))) if leads_n else int(rng.integers(80, 400))
        impressions = int(round(clicks / ctr))
        spend = round(clicks * cpc * rng.uniform(0.85, 1.15), 2)
        ad_rows.append({
            "Date": date, "Source": source, "Search_Type": search_type,
            "Impressions": impressions, "Clicks": clicks, "Spend": spend,
            "Leads_Generated": int(leads_n), "Bookings_Generated": int(bookings_n),
        })

    RECONCILE_SOURCES = {
        "Google Search": {"ctr": 0.032, "cpc": 14, "lead_rate": 0.09},
        "Google PMax": {"ctr": 0.018, "cpc": 22, "lead_rate": 0.05},
        "Google Demand Gen": {"ctr": 0.014, "cpc": 19, "lead_rate": 0.04},
        "Facebook": {"ctr": 0.011, "cpc": 12, "lead_rate": 0.035},
        "Instagram": {"ctr": 0.013, "cpc": 11, "lead_rate": 0.032},
    }
    for _, row in daily_real.iterrows():
        src = row["Source"]
        if src not in RECONCILE_SOURCES:
            continue
        params = RECONCILE_SOURCES[src]
        if src == "Google Search":
            # split leads/bookings ~28% brand / 72% generic; brand converts ~2.3x better
            brand_share = 0.28
            brand_leads = int(round(row["Leads"] * brand_share))
            generic_leads = row["Leads"] - brand_leads
            brand_bookings = min(int(round(row["Bookings"] * 0.45)), brand_leads)
            generic_bookings = max(0, row["Bookings"] - brand_bookings)
            emit_from_leads("Google Search", brand_leads, brand_bookings, row["Date"], "Brand", 0.055, 9, 0.16)
            emit_from_leads("Google Search", generic_leads, generic_bookings, row["Date"], "Generic", 0.024, 16, 0.07)
        else:
            emit_from_leads(src, row["Leads"], row["Bookings"], row["Date"], None, **params)

    # brand-new channels: standalone synthetic volume, no real leads to reconcile against
    NEW_CHANNELS = {
        "Google Display": {"daily_leads": (2, 9), "l2b": 0.09, "ctr": 0.006, "cpc": 7},
        "YouTube": {"daily_leads": (1, 6), "l2b": 0.07, "ctr": 0.008, "cpc": 6},
        "Google Remarketing": {"daily_leads": (3, 12), "l2b": 0.22, "ctr": 0.021, "cpc": 10},
        "Meta Lead Ads": {"daily_leads": (4, 14), "l2b": 0.15, "ctr": 0.017, "cpc": 13},
    }
    for day in all_days:
        d_str = day.strftime("%Y-%m-%d")
        for ch, p in NEW_CHANNELS.items():
            leads_n = int(rng.integers(p["daily_leads"][0], p["daily_leads"][1] + 1))
            bookings_n = int(np.random.binomial(leads_n, p["l2b"])) if leads_n else 0
            emit_from_leads(ch, leads_n, bookings_n, d_str, None, ctr=p["ctr"], cpc=p["cpc"], lead_rate=0.05)

    ad_performance = pd.DataFrame(ad_rows)
    print(f"Ad_Performance: {len(ad_performance)} rows")

    # ---------------- 6. Offline_Channel_Performance ----------------
    OFFLINE = ["TV", "Print", "OOH"]
    zone_weight = {"South": 1.3, "West": 1.2, "North": 1.0, "East": 0.7, "Central": 0.6}
    region_zone = region_master.set_index("Region")["Zone"].to_dict()
    off_rows = []
    for day in all_days:
        # offline campaigns run in flights, not every day — ~40% of days active per channel
        for ch in OFFLINE:
            if rng.random() > 0.4:
                continue
            for region in region_master["Region"]:
                if rng.random() > 0.5:  # not every region active same day
                    continue
                w = zone_weight.get(region_zone.get(region, "Central"), 0.8)
                base_leads = {"TV": (1, 6), "Print": (0, 3), "OOH": (0, 4)}[ch]
                leads_n = int(round(rng.integers(base_leads[0], base_leads[1] + 1) * w))
                l2b = {"TV": 0.05, "Print": 0.06, "OOH": 0.07}[ch]
                bookings_n = int(np.random.binomial(leads_n, l2b)) if leads_n else 0
                spend = round({"TV": 45000, "Print": 12000, "OOH": 18000}[ch] * w * rng.uniform(0.8, 1.2), 2)
                off_rows.append({
                    "Date": day.strftime("%Y-%m-%d"), "Channel": ch, "Region": region,
                    "Spend": spend, "Leads_Generated": leads_n, "Bookings_Generated": bookings_n,
                })
    offline_channel_performance = pd.DataFrame(off_rows)
    print(f"Offline_Channel_Performance: {len(offline_channel_performance)} rows")

    # ---------------- 7. Affiliate_Payout ----------------
    AFFILIATE_SOURCES = ["Delente", "TestDrive Guru", "91Wheels", "BikeWale", "BikeDekho", "GirnarSoft"]
    CPL_RATE = {"Delente": 220, "TestDrive Guru": 280, "91Wheels": 190, "BikeWale": 240, "BikeDekho": 260, "GirnarSoft": 310}
    leads["Month"] = leads["Created_Date"].dt.strftime("%b-%Y")
    payout_rows = []
    for month in leads["Month"].unique():
        for src in AFFILIATE_SOURCES:
            n = int(((leads.Month == month) & (leads.Source == src)).sum())
            rate = CPL_RATE[src]
            payable = round(n * rate, 2)
            paid_pct = rng.uniform(0.6, 1.0)
            paid = round(payable * paid_pct, 2)
            payout_rows.append({
                "Affiliate_Source": src, "Month": month, "Leads_Delivered": n,
                "CPL_Rate": rate, "Amount_Payable": payable, "Amount_Paid": paid,
                "Amount_Receivable": round(payable - paid, 2),
                "Payment_Status": "Paid" if paid >= payable else ("Partially Paid" if paid > 0 else "Pending"),
            })
    affiliate_payout = pd.DataFrame(payout_rows)
    print(f"Affiliate_Payout: {len(affiliate_payout)} rows")

    # ---------------- write back to workbook ----------------
    print("Writing new sheets into workbook...")
    with pd.ExcelWriter(XLSX_PATH, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        region_master.to_excel(writer, sheet_name="Region_Master", index=False)
        call_log.to_excel(writer, sheet_name="Call_Log", index=False)
        follow_up.to_excel(writer, sheet_name="Follow_Up", index=False)
        customer_feedback.to_excel(writer, sheet_name="Customer_Feedback", index=False)
        ad_performance.to_excel(writer, sheet_name="Ad_Performance", index=False)
        offline_channel_performance.to_excel(writer, sheet_name="Offline_Channel_Performance", index=False)
        affiliate_payout.to_excel(writer, sheet_name="Affiliate_Payout", index=False)

    print("Done.")


if __name__ == "__main__":
    main()
