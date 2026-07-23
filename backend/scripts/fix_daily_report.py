"""
Fixes Daily_Report: an earlier append of new sheets (generate_synth_extension.py)
re-saved the workbook via openpyxl, which silently drops the *cached* values of
Excel formulas (openpyxl preserves the formula text but not its computed result).
Daily_Report was formula-driven, so every numeric cell in it went blank/zero.

This recomputes Daily_Report directly from the real Leads table (source of truth)
and writes it back as static values.
"""
import os
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
XLSX_PATH = os.path.join(HERE, "..", "data", "Royal_Enfield_Digital_Intelligence_Platform.xlsx")


def main():
    leads = pd.read_excel(XLSX_PATH, sheet_name="Leads")
    leads["Created_Date"] = pd.to_datetime(leads["Created_Date"])

    rows = []
    for date, g in leads.groupby(leads["Created_Date"].dt.strftime("%Y-%m-%d")):
        new_leads = (g.Lead_Status == "New Lead").sum()
        total_leads = len(g)
        enquiries = total_leads - new_leads
        bookings = (g.Lead_Status == "Booked").sum()
        open_enq = (g.Lead_Status == "Open Enquiry").sum()
        dropped = (g.Lead_Status == "Dropped").sum()
        dup = (g.Duplicate_Flag == "Yes").sum()
        rows.append({
            "Date": date,
            "Leads": int(total_leads),
            "Enquiries": int(enquiries),
            "Bookings": int(bookings),
            "Open_Enquiries": int(open_enq),
            "Dropped": int(dropped),
            "E2B": round(bookings / enquiries, 4) if enquiries else 0,
            "L2B": round(bookings / total_leads, 4) if total_leads else 0,
            "Duplicate_Percentage": round(dup / total_leads, 4) if total_leads else 0,
        })

    daily_report = pd.DataFrame(rows).sort_values("Date")
    print(f"Recomputed Daily_Report: {len(daily_report)} rows")
    print(daily_report.head(3))
    print(daily_report.tail(3))

    with pd.ExcelWriter(XLSX_PATH, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        daily_report.to_excel(writer, sheet_name="Daily_Report", index=False)
    print("Daily_Report written back to workbook.")


if __name__ == "__main__":
    main()
