# InvGate Asset Management (ธีม Veil) — ค่าที่วัดจริงจากหน้าเว็บ

แหล่งข้อมูล: `waddles.is.cloud.invgate.net` (บัญชีทดลองของ Jack) วัดค่าด้วย `getComputedStyle`
ที่ความกว้างหน้าจอ 1920×~855 (บันทึกเมื่อ 25 ส.ค. 2569)

หมายเหตุ: ทุกค่าดึงจาก DOM จริง ไม่ได้กะประมาณจากภาพ — ปลอดภัยที่จะใช้อ้างอิงสร้างเว็บใหม่

---

## โครงหน้า (layout)

| ส่วน | ค่า |
| --- | --- |
| แถบไอคอนซ้าย (navbar) | width **70px**, สูงเต็มจอ |
| ปุ่มไอคอนในแถบซ้าย (navbar-item) | 54×50px, radius 8px |
| แถบบน (topbar) | height **70px** |
| ช่องค้นหาบน topbar | radius **30px** (pill), height 35px, พื้นขาว, เงา `0.5px 0.5px 2px 1px rgba(0,0,0,.04)` |
| แถบแท็บย่อย (subnav) | height **45px**, padding ปุ่ม `10px 15px`, radius ปุ่ม 8px |
| แท็บที่เลือก (subnav-item--active) | ขีดล่าง (::after) สูง **3px**, สี `oklch(0.72 0.07 290 / .5)` (ม่วงจาง), ตัวอักษรสี `#0000EE` (ลิงก์มาตรฐาน แต่ในธีม Veil จริงจะเป็นม่วง-เทา ดู token ด้านล่าง) |
| แถวตาราง (Explorer) | height **65px** |
| หัวตาราง (cell-head) | height 45px, font 12px/500, สี `oklch(0.6 0 0)` |
| แถบเครื่องมือตาราง (toolbar) | height 45px, radius มุมบน 8px |
| การ์ดทั่วไป (.card) | radius **8px**, พื้นขาว, เงา `0.707px 0.707px 3px 0px rgba(0,0,0,.15)` |
| การ์ดใหญ่มี margin-bottom | 20px |
| พื้นหลังเนื้อหาหลัก (layout-main) | `oklch(0.96 0.01 290 / 0.9)` |

## สี

| Token | ค่า | ใช้กับ |
| --- | --- | --- |
| พื้นหลังแอปด้านหลัง (body) | `oklch(0.76 0 0)` + ภาพพื้นหลัง `igam.jpg` โทนม่วง | พื้นหลังนอกการ์ด |
| ปุ่ม topbar "NEW CI" (teal) | `oklch(0.66 0.117 180 / 0.9)` | ปุ่มหลักลงทะเบียน |
| ปุ่ม topbar notifications (blue) | `oklch(0.66 0.13 260 / 0.9)` | ปุ่มรอง |
| ปุ่ม topbar tag (purple) | `oklch(0.62–0.66 0.13–0.15 300 / 0.9)` | ปุ่มแท็ก |
| ข้อความหัวเรื่องหน้า (.settings-module-head-title) | `oklch(0.4 0 0)`, 15px/500 | หัวข้อการ์ด |
| ลิงก์/แท็บ active | `rgb(0,0,238)` (ในบาง element) หรือ `oklch(0.65 0.09 290)` (แท็บหน้าโปรไฟล์) | ข้อความแท็บที่เลือก |
| avatar gradient | `linear-gradient(135deg, oklch(0.65 0.08 3), oklch(0.8 0.08 63))` | วงกลม avatar มุมขวาบน |

### สีสถานะสุขภาพ (health card บนหน้า Profile)
| ระดับ | พื้น | ใช้กับ |
| --- | --- | --- |
| แดง (วิกฤต) | `oklch(0.65 0.1125 25)` ตัวอักษรขาว | เช่น "Warranty is expired" |
| ส้ม (เตือน) | `oklch(0.676 0.09 90)` ตัวอักษรขาว | เช่น "Antivirus is not installed", "Firewall is deactivated" |
| เขียว (ผ่าน) | ไม่ปรากฏในตัวอย่าง — ประมาณ `oklch(0.68 0.115 155)` |

## ตัวอักษร

- ฟอนต์หลัก: `Inter, Arial, Helvetica, sans-serif`
- หัวข้อหน้า (การ์ด): 15px / 500
- หัวเรื่องโปรไฟล์ (ชื่อ CI): 18px / 500 สี `oklch(0.3 0 0)`
- หัวเรื่องรอง (ประเภท + รหัส): 13px / 500 สี `oklch(0.5 0 0)`
- วันที่แก้ไขล่าสุด: 11px / 400 สี `oklch(0.7 0 0)`
- ป้ายค่าตัวเลขในกล่องสถานะ (profile__bt-title): 12px / 500
- หัวตาราง: 12px / 500 สี `oklch(0.6 0 0)`

---

## หน้าโปรไฟล์ทรัพย์สิน (Profile / Asset Detail) — โฟกัสหลักของงานนี้

โครงสร้าง: หัวเรื่อง (thumbnail + ชื่อ + subtitle + วันแก้ไข) → กล่องสถานะ 3 กล่อง (สถานะ/ที่ตั้ง/ผู้ครอบครอง)
แต่ละกล่องมีปุ่มแก้ไขในตัว → ปุ่ม Edit + settings มุมขวา → แท็บ 8 อัน (Home, Hardware, Applications,
Contracts, Financials, Requests, Deployment, Activity) → เนื้อหาแบ่ง 3 คอลัมน์ (การ์ดกว้าง 891px กลาง + คอลัมน์ข้าง 435px × 2)

| Element | ค่า |
| --- | --- |
| กล่องสถานะ (profile__bt-box) | 154×46px, radius 8px 0 0 8px (ต่อกับปุ่มแก้ไขด้านขวา) |
| ปุ่ม Edit บนกล่องสถานะ | อยู่ในกล่องเดียวกัน กว้างรวม 133px |
| การ์ดตัวชี้วัด (card--indicator) | 435×100px, radius 8px, เงาเดียวกับการ์ดทั่วไป |
| การ์ดใหญ่ (card--auto เช่น "Software") | กว้าง 891px, สูงอัตโนมัติ (ตัวอย่าง 346px), แบ่ง grid 3 คอลัมน์ (card__grid--g3) |
| รายการข้อมูลย่อยในการ์ด (card-item) | กว้าง ~277px, สูง 40px, margin-bottom 15px |
| ไอคอนป้ายในรายการ (card-item__icon) | 36–40px, สีตามหมวด เช่น น้ำเงิน `oklch(0.66 0.13 260)` |
| Health status card | หัวเรื่องสีแดง/ส้ม/เขียวตามสถานะ, แถวเงื่อนไขเป็นแถบสีเต็มความกว้าง สูงแถวละ 35px |
| การ์ดคอลัมน์ขวา (Custom fields, Requests, Chain of custody, Tags, OS Users, Attachments, Notes) | กว้าง 435px เท่ากันทุกใบ เรียงต่อกันแนวตั้ง |

**แท็บทั้ง 8 บนหน้าโปรไฟล์:** Home · Hardware · Applications · Contracts · Financials · Requests · Deployment · Activity
(เว็บของเราแปลเป็น: ภาพรวม · ฮาร์ดแวร์ · ซอฟต์แวร์ · สัญญา & ประกัน · การเงิน · งานซ่อม · การส่งมอบ · ประวัติ)

---

## ภาพหน้าจอที่เก็บไว้ (โฟลเดอร์ `screenshots/`)

| ไฟล์ | หน้า |
| --- | --- |
| `dashboard.png` | Dashboard หลัก (CI status, Security Compliance donut, Geolocation) |
| `settings-asset-types.png` | Settings ▸ CIs ▸ Asset Types (ต้นแบบหน้า "ข้อมูลหลัก") |
| `assets-explorer.png` | Assets ▸ Explorer (ตารางหลัก) |
| `asset-profile-home.png` | Profile ▸ Home (หน้ารายละเอียดที่ใช้เป็นต้นแบบหลัก) |
| `asset-profile-home-scrolled.png` | ส่วนล่างของหน้าเดียวกัน (Network, Source, Notes) |
| `software-explorer.png` | Software ▸ Explorer |
| `contracts-explorer.png` | Contracts |
| `procurement-po.png` | Procurement ▸ Purchase Orders |
| `activities.png` | Activities log ทั้งระบบ |
| `settings-general.png` | Settings ▸ General ▸ Preferences |
| `cmdb-explorer.png` | CMDB ▸ Business Applications |

ใช้ภาพเหล่านี้เทียบเคียงตอนปรับ CSS ให้ใกล้เคียงมากขึ้น — ไฟล์ทั้งหมดเป็นภาพหน้าจอจริงจากระบบทดลองของ Jack ไม่ใช่ของสมมติ
