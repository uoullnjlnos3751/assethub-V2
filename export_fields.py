import pandas as pd

# Define the schema fields per topic
data = {
    "หมวดหมู่ (Topic)": [
        "ข้อมูลพื้นฐาน (Base Asset)"] * 21 + 
        ["คอมพิวเตอร์ (Computer)"] * 15 + 
        ["โทรศัพท์/แท็บเล็ต (Phone)"] * 8 + 
        ["จอภาพ (Monitor)"] * 7 + 
        ["อุปกรณ์ทั่วไป (Device)"] * 4 + 
        ["อุปกรณ์เครือข่าย (Network)"] * 7 + 
        ["ตู้แร็ค (Rack)"] * 4 + 
        ["เครื่องพิมพ์ (Printer)"] * 7 + 
        ["สายสัญญาณ (Cable)"] * 4 + 
        ["วัสดุสิ้นเปลือง (Consumable)"] * 5,
    
    "ชื่อฟิลด์ (Field Name)": [
        # Base Asset
        "assetCode", "oldAssetCode", "assetName", "serialNo", "type", "brand", "model", 
        "vendor", "poNumber", "prNumber", "purchaseDate", "purchasePrice", "warrantyEndDate", 
        "ownerName", "departmentId", "location", "floor", "company", "status", "budget", "remark",
        
        # Computer
        "cpu", "cpuGeneration", "ram", "ramSlot1", "ramSlot2", "storage1", "storage2", 
        "gpu", "osType", "osVersion", "windowsLicense", "officeLicense", "antivirusStatus", 
        "domainName", "snComputer",
        
        # Phone
        "imei1", "imei2", "osVersion", "storageCapacity", "ram", "phoneNumber", "mdmEnrolled", "simProvider",
        
        # Monitor
        "screenSize", "resolution", "panelType", "refreshRate", "ports", "hasSpeaker", "curved",
        
        # Device
        "deviceType", "connectionType", "powerSource", "rgbSupport",
        
        # Network
        "networkType", "ipAddress", "macAddress", "firmwareVersion", "portCount", "locationRack", "poeSupport",
        
        # Rack
        "subType", "rackUnits", "powerCapacity", "rackLocation",
        
        # Printer
        "printerType", "isColor", "networkReady", "ipAddress", "macAddress", "pageCount", "duplexSupport",
        
        # Cable
        "cableType", "length", "stockQuantity", "minimumStock",
        
        # Consumable
        "consumableType", "compatibleWith", "stockQuantity", "minimumStock", "expiryDate"
    ],
    
    "คำอธิบาย / ชนิดข้อมูล": [
        # Base Asset
        "รหัสทรัพย์สิน (String)", "รหัสทรัพย์สินเดิม (String)", "ชื่อทรัพย์สิน (String)", "Serial Number (String)", 
        "ประเภท (String)", "ยี่ห้อ (String)", "รุ่น (String)", "ผู้จัดจำหน่าย (String)", 
        "เลขที่ PO (String)", "เลขที่ PR (String)", "วันที่ซื้อ (Date)", "ราคา (Float)", 
        "วันหมดประกัน (Date)", "ชื่อผู้ถือครอง (String)", "แผนก (String)", "สถานที่ (String)", 
        "ชั้น (String)", "บริษัท (String)", "สถานะ (Enum: Available, InUse, etc.)", "งบประมาณ (String)", "หมายเหตุ (String)",
        
        # Computer
        "ซีพียู (String)", "รุ่นซีพียู (String)", "ขนาดแรมรวม (String)", "แรมสล็อต 1 (String)", "แรมสล็อต 2 (String)", 
        "พื้นที่เก็บข้อมูล 1 (String)", "พื้นที่เก็บข้อมูล 2 (String)", "การ์ดจอ (String)", "ประเภท OS (String)", 
        "เวอร์ชัน OS (String)", "ไลเซนส์ Windows (String)", "ไลเซนส์ Office (String)", "สถานะ Antivirus (String)", 
        "ชื่อโดเมน (String)", "S/N คอมพิวเตอร์ (String)",
        
        # Phone
        "IMEI 1 (String)", "IMEI 2 (String)", "เวอร์ชัน OS (String)", "ความจุ (String)", 
        "แรม (String)", "เบอร์โทรศัพท์ (String)", "ลงทะเบียน MDM (Boolean)", "ผู้ให้บริการซิม (String)",
        
        # Monitor
        "ขนาดหน้าจอ (String)", "ความละเอียด (String)", "ประเภท Panel (String)", "Refresh Rate (String)", 
        "พอร์ต (String)", "มีลำโพงในตัว (Boolean)", "จอโค้ง (Boolean)",
        
        # Device
        "ประเภทอุปกรณ์ (String)", "การเชื่อมต่อ (String)", "แหล่งพลังงาน (String)", "รองรับ RGB (Boolean)",
        
        # Network
        "ประเภทเครือข่าย (String)", "IP Address (String)", "MAC Address (String)", "เวอร์ชันเฟิร์มแวร์ (String)", 
        "จำนวนพอร์ต (Int)", "ตำแหน่งในตู้แร็ค (String)", "รองรับ POE (Boolean)",
        
        # Rack
        "ประเภทตู้ย่อย (String)", "ขนาด (U) (String)", "ความจุไฟ (String)", "สถานที่ตั้งตู้ (String)",
        
        # Printer
        "ประเภทเครื่องพิมพ์ (String)", "พิมพ์สีได้ (Boolean)", "ต่อเครือข่ายได้ (Boolean)", "IP Address (String)", 
        "MAC Address (String)", "จำนวนหน้าที่พิมพ์แล้ว (Int)", "พิมพ์สองหน้า (Boolean)",
        
        # Cable
        "ประเภทสาย (String)", "ความยาว (String)", "จำนวนในคลัง (Int)", "จำนวนขั้นต่ำ (Int)",
        
        # Consumable
        "ประเภทวัสดุสิ้นเปลือง (String)", "ใช้งานร่วมกับ (String)", "จำนวนในคลัง (Int)", "จำนวนขั้นต่ำ (Int)", "วันหมดอายุ (Date)"
    ]
}

df = pd.DataFrame(data)

# Export to CSV (with utf-8-sig for proper Excel Thai display)
output_path = "c:\\Apps\\assethub-V2\\Asset_Fields_List.csv"
df.to_csv(output_path, index=False, encoding='utf-8-sig')

print(f"CSV file created successfully at: {output_path}")
