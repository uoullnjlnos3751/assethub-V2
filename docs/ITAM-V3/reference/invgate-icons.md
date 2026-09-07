# InvGate — ชุดไอคอนและโครงเมนูทั้งหมด (เก็บจากระบบจริง)

InvGate เรียกไอคอนเป็นไฟล์ `.svg` แยกไฟล์ต่อหนึ่งไอคอน (ไม่ใช่ icon font / sprite)
ชื่อไฟล์ด้านล่างคือชื่อจริงที่ดึงได้จาก DOM — บอกได้ว่าไอคอนแต่ละตัวเป็นรูปอะไร

## แถบเมนูซ้าย (10 + 1)
| ลำดับ | ป้ายกำกับ | Route | รูปไอคอน |
|---|---|---|---|
| 1 | DASHBOARD | `#/home/dashboard` | แผงกริด 4 ช่อง |
| 2 | ASSETS | `#/assets/explorer` | โน้ตบุ๊ก |
| 3 | SOFTWARE | `#/software/explorer` | กล่อง/แผ่นโปรแกรม |
| 4 | CONTRACTS | `#/contracts/explorer` | ตราประทับ/เหรียญรับรอง |
| 5 | PROCUREMENT | `#/procurement/purchase-orders` | รถเข็นสินค้า |
| 6 | CMDB | `#/business/explorer` | ชั้นฐานข้อมูล |
| 7 | OTHER CIS | `#/others` | กล่องพัสดุ 3 มิติ |
| 8 | ACTIVITIES | `#/global-activities/explorer` | นาฬิกาย้อนเวลา |
| 9 | RECOMMENDATIONS | `#/smart-recommendations` | ประกายดาว (AI) |
| 10 | SETTINGS | `#/settings/index` | เฟือง |
| — | Service Desk | ลิงก์ออกไป `waddles.sd.cloud` | หูฟัง (`headphones.svg`) |

## Assets — 3 แท็บ
`assets.svg` · `assets-cloud.svg` · `discovery.svg`

## Software — 8 แท็บ
`software.svg` · `software-cloud.svg` · `application-services.svg` ·
`application-services-discovery.svg` · `software-updates.svg` · `deployment.svg` ·
`databases.svg` · `authorization-policies.svg`
(ไอคอนประจำแถวรายการซอฟต์แวร์ = `software.svg`)

## Contracts — 2 แท็บ
`contracts.svg` · `software-compliance.svg` (ไอคอนประจำแถว = `contract.svg`)

## Procurement — 2 แท็บ
Purchase Orders (BETA) · Vendors

## Other CIs — 4 แท็บ
`users.svg` · `locations.svg` · Vendors · `cost-centers.svg`
(ไอคอนประจำแถวบุคคล = `user.svg`)

## Settings — 10 หมวด
| หมวด | ไฟล์ไอคอน |
|---|---|
| General | `settings.svg` |
| Users | `users.svg` |
| CIs | `assets.svg` |
| Software Deployment | `deployment.svg` |
| Discovery | `network.svg` |
| Tasks | `tasks.svg` |
| Email | `email.svg` |
| AI Hub | `ai-hub.svg` |
| Integrations | `integrations.svg` |
| System | `system.svg` |

## ไอคอนอื่นที่พบ
`logo.svg` · `desktop.svg` (ไอคอนประเภทอุปกรณ์ Desktop) · `headphones.svg`

---

## หมายเหตุเรื่องลิขสิทธิ์

ไฟล์ `.svg` เหล่านี้เป็นงานออกแบบของ InvGate การคัดลอกไฟล์จริงไปใช้ในระบบ
Production ขององค์กรเป็นการใช้งานทรัพย์สินทางปัญญาของเขาโดยไม่มีสิทธิ์

Template ที่ส่งให้จึงใช้วิธี **วาดไอคอนขึ้นใหม่ทั้งหมด** ให้ครอบคลุมทุกหัวข้อ
ในตารางข้างบน ซึ่งได้ผลดีกว่าในทางปฏิบัติด้วย:

* เป็น inline SVG อยู่ในไฟล์เดียว ไม่ต้องโหลดไฟล์ภายนอก 50 ไฟล์
* ใช้ `currentColor` จึงเปลี่ยนสีตาม Theme ได้เอง รองรับ Dark mode
* ไม่มีความเสี่ยงด้านลิขสิทธิ์เมื่อนำไปใช้จริงในองค์กร

หากต้องการชุดไอคอนสำเร็จรูปที่ใช้เชิงพาณิชย์ได้ฟรี แนะนำ **Lucide** (ISC License)
หรือ **Phosphor Icons** (MIT) ซึ่งมีไอคอนครบทุกหัวข้อในตารางนี้
