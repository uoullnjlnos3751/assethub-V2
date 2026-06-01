import csv
import json
import requests
import sys

BASE_URL = "http://localhost:4000/api"

# Login first to get token
login_res = requests.post(f"{BASE_URL}/auth/login", json={
    "username": "watchara.kid",
    "password": "Jack@3751"
})
if login_res.status_code != 200:
    print(f"Login failed: {login_res.text}")
    sys.exit(1)

token = login_res.json()["token"]
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def parse_excel_date(val):
    """Convert Excel serial date to ISO date"""
    if not val or val == '' or val == '-':
        return None
    try:
        # Excel serial date
        serial = float(val)
        from datetime import datetime, timedelta
        epoch = datetime(1899, 12, 30)
        delta = timedelta(days=serial)
        return (epoch + delta).strftime('%Y-%m-%d')
    except:
        # Try parsing as YYYY-MM-DD
        return val

def map_row(row):
    """Map CSV columns to backend field names"""
    # Get values by column index since Thai headers may be garbled
    vals = list(row.values())
    
    # Column mapping by position:
    # 0: รหัสทรัพย์สิน (Asset Code)
    # 1: Serial Number
    # 2: ประเภทอุปกรณ์ (Type)
    # 3: ยี่ห้อ (Brand)
    # 4: รุ่น (Model)
    # 5: Company
    # 6: ผู้ถือครอง (Owner)
    # 7: แผนก (Department)
    # 8: Location
    # 9: Floor
    # 10: สถานะ (Status)
    # 11: Domain Name
    # 12: OS
    # 13: Windows (OS Version)
    # 14: MS Office (Office License)
    # 15: Antivirus
    # 16: CPU
    # 17: Generation
    # 18: GPU
    # 19: RAM
    # 20: RAM Slot1
    # 21: RAM Slot2
    # 22: Storage 1
    # 23: Storage 2
    # 24: PR No.
    # 25: PO Date
    # 26: PO No.
    # 27: Vendor
    # 28: วันที่ซื้อ (Purchase Date)
    # 29: อายุ (ปี) (Age)
    # 30: หมายเหตุ (Remark)
    
    return {
        "assetCode": vals[0].strip() if vals[0] else "",
        "serialNo": vals[1].strip() if vals[1] else "",
        "type": vals[2].strip() if vals[2] else "",
        "brand": vals[3].strip() if vals[3] else "",
        "model": vals[4].strip() if vals[4] else "",
        "company": vals[5].strip() if vals[5] else "",
        "ownerName": vals[6].strip() if vals[6] else "",
        "departmentId": vals[7].strip() if vals[7] else "",
        "location": vals[8].strip() if vals[8] else "",
        "floor": vals[9].strip() if vals[9] else "",
        "status": vals[10].strip() if vals[10] else "Available",
        "domainName": vals[11].strip() if vals[11] else "",
        "osType": vals[12].strip() if vals[12] else "",
        "osVersion": vals[13].strip() if vals[13] else "",
        "windowsLicense": "",
        "officeLicense": vals[14].strip() if vals[14] else "",
        "antivirusStatus": vals[15].strip() if vals[15] else "",
        "cpu": vals[16].strip() if vals[16] else "",
        "cpuGeneration": vals[17].strip() if vals[17] else "",
        "gpu": vals[18].strip() if vals[18] else "",
        "ram": vals[19].strip() if vals[19] else "",
        "ramSlot1": vals[20].strip() if vals[20] else "",
        "ramSlot2": vals[21].strip() if vals[21] else "",
        "storage1": vals[22].strip() if vals[22] else "",
        "storage2": vals[23].strip() if vals[23] else "",
        "prNumber": vals[24].strip() if vals[24] else "",
        "poDate": parse_excel_date(vals[25]),
        "poNumber": vals[26].strip() if vals[26] else "",
        "vendor": vals[27].strip() if vals[27] else "",
        "purchaseDate": parse_excel_date(vals[28]),
        "remark": vals[30].strip() if len(vals) > 30 and vals[30] else "",
    }

with open(r'C:\Apps\assethub-V2\assets-2026-05-15.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"Found {len(rows)} rows in CSV")

created = 0
updated = 0
failed = 0

for i, row in enumerate(rows):
    asset = map_row(row)
    
    # Skip rows with no asset code and no serial
    if not asset['assetCode'] and not asset['serialNo']:
        print(f"Row {i+1}: Skipping (no asset code or serial)")
        failed += 1
        continue
    
    try:
        res = requests.post(f"{BASE_URL}/assets/upsert", json=asset, headers=headers)
        if res.status_code in [200, 201]:
            action = res.json().get('action', 'unknown')
            if action == 'created':
                created += 1
            else:
                updated += 1
        else:
            print(f"Row {i+1} ({asset['assetCode']}): Failed - {res.text[:200]}")
            failed += 1
    except Exception as e:
        print(f"Row {i+1} ({asset['assetCode']}): Error - {e}")
        failed += 1
    
    if (i + 1) % 10 == 0:
        print(f"Progress: {i+1}/{len(rows)} (Created: {created}, Updated: {updated}, Failed: {failed})")

print(f"\nImport Complete!")
print(f"Created: {created}")
print(f"Updated: {updated}")
print(f"Failed: {failed}")
