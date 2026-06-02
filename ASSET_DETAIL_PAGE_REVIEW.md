# ทะเบียนทรัพย์สิน - รายงานการตรวจสอบและแนะนำการปรับแก้ไข

**วันที่ตรวจสอบ:** 2 มิถุนายน 2026  
**สถานะ:** ต้องการปรับแก้ไขให้ครบสมบูรณ์

---

## 📋 สรุปสั้น ๆ

ระบบทะเบียนทรัพย์สินมีโครงสร้างที่ดี แต่มีข้อบกพร่องและช่องว่างหลายประการ ที่ต้องแก้ไขเพื่อให้ระบบ:
- ✅ มีความสมบูรณ์ของข้อมูล (Data Integrity)
- ✅ มีการควบคุมและตรวจสอบที่เข้มงวด (Data Validation)
- ✅ มี UX ที่ดีและเข้าใจง่าย (User Experience)
- ✅ มีการติดตามการเปลี่ยนแปลง (Audit Trail)

---

## 🔴 ปัญหาร้ายแรง (Critical Issues)

### 1. **ข้อมูลบังคับ (Required Fields) ไม่ชัดเจน**
**ตำแหน่ง:** `AssetFormPage.tsx` และ Backend routes

**ปัญหา:**
- เฉพาะ Serial Number เท่านั้นที่มีการตรวจสอบบังคับ (`line 404` ใน AssetFormPage.tsx)
- ไม่มีการบังคับให้กรอก: `assetName`, `type`, `category`, `brand`, `model`, `owner`
- ผู้ใช้สามารถบันทึกทรัพย์สินที่ไม่สมบูรณ์ได้

**ผลกระทบ:**
- ข้อมูลในระบบไม่น่าเชื่อถือ
- ยากต่อการรายงานและวิเคราะห์

**แนะนำแก้ไข:**
```typescript
// AssetFormPage.tsx - สร้างฟังก์ชันตรวจสอบ
const validateAsset = (): string => {
  const requiredFields = [
    { key: 'serialNo', label: 'Serial Number' },
    { key: 'assetName', label: 'ชื่อทรัพย์สิน' },
    { key: 'type', label: 'ประเภท' },
    { key: 'brand', label: 'ยี่ห้อ' },
    { key: 'departmentId', label: 'แผนก' },
    { key: 'ownerName', label: 'ผู้ถือครอง' },
  ];
  
  for (const field of requiredFields) {
    if (!form[field.key]?.trim()) {
      return `กรุณากรอก ${field.label}`;
    }
  }
  
  // ตรวจสอบรูปแบบ Serial Number
  if (!/^[A-Z0-9\-]+$/i.test(form.serialNo)) {
    return 'Serial Number ต้องเป็นตัวอักษร ตัวเลข หรือขีดกลาง';
  }
  
  return '';
};

// ใช้ในฟังก์ชัน handleSave
const handleSave = async () => {
  const validError = validateAsset();
  if (validError) {
    setError(validError);
    return;
  }
  // ... continue saving
};
```

---

### 2. **ข้อมูลซ้ำ (Duplicates) ไม่ได้ป้องกัน**
**ตำแหน่ง:** `backend/src/routes/assets.ts`

**ปัญหา:**
- มีฟังก์ชัน `checkDuplicate()` แต่ไม่บังคับ
- สามารถบันทึก Serial Number, Asset Code, Asset Name ที่ซ้ำได้
- ระบบมีการแจ้งเตือน แต่ไม่บล็อก

**ผลกระทบ:**
- ข้อมูลซ้ำทำให้ติดตามทรัพย์สินได้ยาก
- ทำให้ประวัติติดตาม (History) สับสน

**แนะนำแก้ไข:**
```typescript
// backend/src/routes/assets.ts
router.post('/assets', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { serialNo, assetCode, assetName } = req.body;
    const { excludeId } = req.query;

    // ตรวจสอบ Serial Number (ต้องไม่ซ้ำ)
    if (serialNo) {
      const existing = await prisma.asset.findFirst({
        where: {
          serialNo: serialNo.trim(),
          id: { not: excludeId ? parseInt(excludeId as string) : undefined }
        }
      });
      
      if (existing) {
        return res.status(400).json({
          error: 'Serial Number นี้มีในระบบแล้ว (ID: ' + existing.id + ')',
          duplicate: 'serialNo'
        });
      }
    }

    // ตรวจสอบ Asset Code (ต้องไม่ซ้ำ)
    if (assetCode) {
      const existing = await prisma.asset.findFirst({
        where: {
          assetCode: assetCode.trim(),
          id: { not: excludeId ? parseInt(excludeId as string) : undefined }
        }
      });
      
      if (existing) {
        return res.status(400).json({
          error: 'Asset Code นี้มีในระบบแล้ว',
          duplicate: 'assetCode'
        });
      }
    }
    
    // ... continue with save
  } catch (err) {
    next(err);
  }
});
```

---

### 3. **ประเภทและแบรนด์ไม่สมบูรณ์**
**ตำแหน่ง:** `AssetFormPage.tsx`, `AssetListPage.tsx`

**ปัญหา:**
- ประเภท (Type) โหลดจาก API แต่ไม่มีการตรวจสอบว่า type มีอยู่ในรายชื่ออนุญาตหรือไม่
- Brand ไม่มีค่าเริ่มต้นหรือเสนอแนะ
- บางครั้ง type อาจเป็นค่าแปลก ๆ

**แนะนำแก้ไข:**
```typescript
// AssetFormPage.tsx
const handleTypeChange = (e: any) => {
  const newType = e.target.value;
  setFormField('type', 'ประเภท', newType);
  
  // หา Brand แนะนำตามประเภท
  const suggestedBrands = getBrandSuggestionsForType(newType);
  setAvailableBrands(suggestedBrands);
  
  // ถ้าค่าที่เลือกเป็น Type ที่ต้องให้เลือกจาก Category
  if (!availableTypes.includes(newType)) {
    showToast('⚠️ ประเภท "' + newType + '" ไม่อยู่ในรายชื่อมาตรฐาน', '#f59e0b');
  }
};

// ตัวช่วยแนะนำแบรนด์
function getBrandSuggestionsForType(type: string): string[] {
  const suggestions: Record<string, string[]> = {
    'notebook': ['Dell', 'HP', 'Lenovo', 'ASUS', 'MacBook'],
    'desktop': ['Dell', 'HP', 'Lenovo', 'ASUS'],
    'monitor': ['Dell', 'LG', 'ASUS', 'HP', 'BenQ'],
    'printer': ['HP', 'Canon', 'Brother', 'Xerox'],
    'router': ['Cisco', 'Fortinet', 'Ubiquiti'],
  };
  return suggestions[type.toLowerCase()] || [];
}
```

---

## 🟠 ปัญหาปานกลาง (Medium Issues)

### 4. **การแสดงข้อมูล (UI) ไม่ครบถ้วน**
**ตำแหน่ง:** `AssetDetailPage.tsx` (บรรทัด 150-300)

**ปัญหา:**
- แสดงข้อมูลเฉพาะ specification แต่ไม่แสดง:
  - 📅 วันที่สร้าง/แก้ไข (Created/Updated dates)
  - 👤 ผู้ที่สร้างและแก้ไข (Created by/Updated by)
  - 📝 ประวัติการเปลี่ยนแปลง (Change history) โดยย่อ
  - 🏷️ ชื่อ Category ที่ชัดเจน

**แนะนำแก้ไข:**
```typescript
// AssetDetailPage.tsx - เพิ่ม Metadata section
function MetadataSection({ asset }: { asset: any }) {
  return (
    <Card sx={{ mb: 2, border: '1px solid rgba(0,0,0,0.1)' }}>
      <CardContent>
        <Grid container spacing={2}>
          <SpecItem 
            label="📅 สร้างเมื่อ" 
            value={asset.createdAt ? new Date(asset.createdAt).toLocaleString('th-TH') : '-'} 
          />
          <SpecItem 
            label="✏️ แก้ไขล่าสุด" 
            value={asset.updatedAt ? new Date(asset.updatedAt).toLocaleString('th-TH') : '-'} 
          />
          <SpecItem 
            label="📂 Category" 
            value={asset.category?.name || '-'} 
          />
          <SpecItem 
            label="🏷️ Asset Code" 
            value={asset.assetCode || '(ยังไม่มี)'} 
          />
        </Grid>
      </CardContent>
    </Card>
  );
}
```

---

### 5. **GLPI Sync ไม่สมบูรณ์**
**ตำแหน่ง:** `AssetDetailPage.tsx` (บรรทัด 250-280)

**ปัญหา:**
- ดึงข้อมูล GLPI แต่ไม่มีการบันทึกลง History
- ไม่มี Timestamp ว่าดึงเมื่อไร
- ไม่มีการเตือนถ้า GLPI Spec เสียหาย

**แนะนำแก้ไข:**
```typescript
// backend/src/routes/assets.ts
router.post('/assets/:id/sync-glpi', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(id) } });
    
    if (!asset?.serialNo) {
      return res.status(400).json({ error: 'ไม่มี Serial Number' });
    }

    const glpiSpec = await fetchGLPISpecBySerial(asset.serialNo);
    
    // อัปเดตข้อมูลจาก GLPI
    const updated = await prisma.asset.update({
      where: { id: parseInt(id) },
      data: {
        cpu: glpiSpec.cpu || asset.cpu,
        ram: glpiSpec.ram || asset.ram,
        osVersion: glpiSpec.os || asset.osVersion,
        windowsLicense: glpiSpec.license || asset.windowsLicense,
        updatedAt: new Date(),
      }
    });

    // บันทึก History
    await prisma.assetHistory.create({
      data: {
        assetId: parseInt(id),
        action: 'GLPI_SYNC',
        changes: JSON.stringify({
          cpu: glpiSpec.cpu,
          ram: glpiSpec.ram,
          osVersion: glpiSpec.os
        }),
        actorId: req.user?.id,
        timestamp: new Date(),
      }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
```

---

### 6. **ข้อมูลอายุ (Age Calculation) ไม่ถูกต้องบางครั้ง**
**ตำแหน่ง:** `AssetFormPage.tsx` (บรรทัด 170), `assets.ts` (บรรทัด 64)

**ปัญหา:**
- อายุคำนวณเฉพาะเมื่อโหลดหน้า ไม่อัปเดตแบบเรียลไทม์
- ถ้า purchaseDate ว่างเปล่า age จะ null แทนที่จะแสดง "ไม่ทราบ"

**แนะนำแก้ไข:**
```typescript
// AssetDetailPage.tsx
const getAssetAge = (): string => {
  if (!asset.purchaseDate) return '(ไม่ทราบ)';
  
  const purchased = new Date(asset.purchaseDate);
  const today = new Date();
  let years = today.getFullYear() - purchased.getFullYear();
  const monthDiff = today.getMonth() - purchased.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < purchased.getDate())) {
    years -= 1;
  }
  
  if (years < 0) return '(วันจัดซื้อยังไม่ถึง)';
  if (years === 0) return '< 1 ปี';
  return `${years} ปี`;
};

// ใช้ในการแสดง
<SpecItem label="📊 อายุ" value={getAssetAge()} />
```

---

## 🟡 ปัญหาเล็กน้อย (Minor Issues)

### 7. **ไม่มีการแสดงผลบันทึก (Logs)**
- ระบบไม่มีหน้า Audit Log เพื่อดูว่า asset ถูกแก้ไขโดยใครเมื่อไร
- แนะนำ: สร้างหน้า `/assets/:id/history` แสดงทุกครั้งที่มีการเปลี่ยนแปลง

### 8. **ไม่มีการ Validate รูปภาพ**
- ตรวจสอบเฉพาะนามสกุลไฟล์ ไม่ตรวจสอบเนื้อหา
- แนะนำ: ตรวจสอบ MIME type ของไฟล์อย่างแท้จริง

### 9. **ไม่มี Department Master Data**
- แผนก (Department) โหลดจาก API แต่ไม่มีการเดินทางข้อมูล
- แนะนำ: สร้างหน้า `departmentsManagement` เพื่อจัดการแผนก

### 10. **Warranty Date ไม่มีการตรวจสอบ**
- ยินยอมให้ Warranty End Date เป็นก่อน Purchase Date
- แนะนำ: เพิ่มการตรวจสอบ `warrantyEndDate > purchaseDate`

---

## ✅ สิ่งที่ดีในระบบ

1. ✨ UI Design ดี มี emoji icons ทำให้เข้าใจง่าย
2. 🔒 มีระบบ Authentication และ Authorization
3. 📱 Responsive design สำหรับมือถือ
4. 🏷️ มี Asset History tracking (ดึง GLPI และการอัปเดต)
5. 📸 รองรับการอัพโหลดรูปภาพทรัพย์สิน
6. 🔄 มี Category mapping สำหรับประเภทต่าง ๆ

---

## 📋 ลำดับความสำคัญในการแก้ไข

| ลำดับ | ปัญหา | ความสำคัญ | เวลาประมาณ | ประเภท |
|------|-------|---------|----------|--------|
| 1 | Required Fields Validation | 🔴 Critical | 2-3 ชม. | Backend + Frontend |
| 2 | Duplicate Prevention | 🔴 Critical | 1-2 ชม. | Backend |
| 3 | Type/Brand Validation | 🟠 Medium | 1-2 ชม. | Frontend |
| 4 | UI - Metadata Display | 🟠 Medium | 1-2 ชม. | Frontend |
| 5 | GLPI Sync History | 🟠 Medium | 2-3 ชม. | Backend |
| 6 | Audit Log Page | 🟠 Medium | 2-3 ชม. | Full Stack |
| 7 | Warranty Date Validation | 🟡 Minor | 30 นาที | Frontend |
| 8 | Department Management | 🟡 Minor | 2-3 ชม. | Full Stack |

---

## 📝 ตัวอย่างการปรับแก้ไขขั้นต่ำ (MVP Changes)

### Priority 1: Required Fields Validation
**ไฟล์ที่ต้องแก้:** 
- `frontend/src/pages/assets/AssetFormPage.tsx`
- `backend/src/routes/assets.ts`

### Priority 2: Duplicate Prevention
**ไฟล์ที่ต้องแก้:**
- `backend/src/routes/assets.ts`

### Priority 3: Better UI Display
**ไฟล์ที่ต้องแก้:**
- `frontend/src/pages/assets/AssetDetailPage.tsx`

---

## 🎯 ข้อสรุป

ระบบมีพื้นฐานที่ดี แต่ต้องปรับแก้ไขเพื่อให้:
1. ✅ **Data Integrity** - ข้อมูลบังคับ ไม่ให้บันทึกซ้ำ
2. ✅ **User Experience** - แสดงข้อมูลครบถ้วน ชัดเจน
3. ✅ **Audit Trail** - ติดตามการเปลี่ยนแปลง
4. ✅ **Error Handling** - แจ้งเตือนผู้ใช้อย่างชัดเจน

แนะนำให้เริ่มจากการแก้ไข Priority 1 ก่อน เพื่อให้ข้อมูลในระบบเชื่อถือได้

---

**วันที่เสร็จสิ้น:** 2 มิถุนายน 2026
