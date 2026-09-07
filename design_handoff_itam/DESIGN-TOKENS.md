# Design Tokens

ทุกค่าดึงจากไฟล์ต้นแบบโดยตรง ให้ใช้ค่าตามนี้อย่างเคร่งครัด

## สี

### พื้นหลังและโครงหน้า
| ชื่อ | ค่า | ใช้กับ |
| --- | --- | --- |
| `app-bg` | `radial-gradient(1200px 700px at 60% -10%, #eef3fb 0%, #f4f7fc 60%)` | พื้นหลังหน้าจอ |
| `surface` | `#ffffff` | การ์ด ตาราง แถบเครื่องมือ |
| `surface-sunken` | `#f8fafc` | ช่องกรอก แถวย่อย พื้นในการ์ด |
| `surface-alt` | `#f4f7fb` | หัวตารางย่อย ไอคอนกล่อง |
| `border` | `#e3e9f2` | เส้นขอบการ์ดหลัก |
| `border-strong` | `#dde5f0` | เส้นขอบช่องกรอก |
| `border-input` | `#d6dfec` | ปุ่มรอง |
| `divider` | `#edf1f7` | เส้นคั่นแถวตาราง |
| `border-dashed` | `#cfd9e8` | กรอบประ (drop zone / เพิ่มรายการ) |

### ข้อความ
| ชื่อ | ค่า | ใช้กับ |
| --- | --- | --- |
| `text` | `#15243c` | ข้อความหลัก |
| `text-strong` | `#1f3350` | ค่าที่เน้น |
| `text-body` | `#31435c` | ข้อความในช่องกรอก |
| `text-muted` | `#68788e` | คำอธิบาย ป้ายกำกับ |
| `text-muted-2` | `#54637a` | ข้อความรอง |
| `text-subtle` | `#7a889c` | footer |
| `text-faint` | `#a3b0c2` | placeholder ไอคอนจาง |
| `text-disabled` | `#c9d4e3` | ปุ่มที่ถูกล็อก |

### สีสถานะ (semantic)
| ชื่อ | เส้น/ข้อความ | RGB สำหรับ rgba() | พื้น |
| --- | --- | --- | --- |
| primary (ฟ้าคราม) | `#0891b2` / `#0e7490` | `8,145,178` | `#f0fbfe` |
| info (น้ำเงิน) | `#2563eb` | `37,99,235` | — |
| success | `#059669` / `#047857` | `5,150,105` | `#f0fdf4` |
| warning | `#c2820a` / `#b45309` / `#92400e` | `194,130,10` | `#fffaf5` |
| danger | `#dc2626` / `#b91c1c` | `220,38,38` | `#fff5f5` |
| purple (บริษัท/ยืม) | `#7c3aed` / `#6d28d9` | `124,58,237` | `#faf7ff` |
| neutral | `#54637a` | `107,120,140` | `#f8fafc` |

### สีบนภาพผังห้อง (โหมดมืด)
พื้น `#071120` → `#0b1524` · ข้อความ `#eaf6ff` / `rgba(226,240,255,.72)` · accent `#22d3ee` `#60a5fa` `#a78bfa` `#34d399` `#fbbf24` `#f87171`

### Gradient
- ปุ่มหลัก: `linear-gradient(120deg, #0891b2, #2563eb)`
- เงาปุ่มหลัก: `0 6px 16px rgba(8,145,178,.25)`

## ตัวอักษร

```
font-family: 'IBM Plex Sans Thai', 'IBM Plex Sans', system-ui, sans-serif;
```
ตัวเลข รหัส อีเมล และ ID ใช้ `'IBM Plex Sans', sans-serif` เสมอ (ตัวเลขเรียงตรง)

| การใช้งาน | ขนาด | น้ำหนัก |
| --- | --- | --- |
| หัวข้อหน้า | 24px | 700 |
| KPI ใหญ่ | 34–36px | 700 |
| KPI กลาง | 26–30px | 700 |
| หัวข้อการ์ด | 15px | 600 |
| หัวข้อย่อย | 13.5–14px | 600 |
| ข้อความปกติ / ตาราง | 13px | 400 |
| ปุ่ม | 13.5px | 600 (หลัก) / 400 (รอง) |
| คำอธิบาย | 12–12.5px | 400 |
| หัวตาราง | 12px | 500 |
| ป้าย chip | 11–11.5px | 400 |
| ป้ายเล็กสุด | 10.5px | 400 |
| breadcrumb | 12.5px | 400 |

letter-spacing: `.06em` สำหรับป้ายตัวใหญ่ · `.16–.22em` สำหรับหัวข้อ ALL CAPS

## ระยะห่าง

- ช่องว่างระหว่างส่วน: `16px`
- ช่องว่างระหว่างการ์ดในแถว: `12–16px`
- padding การ์ดหลัก: `20px 24px 22px`
- padding การ์ดกะทัดรัด: `18px 22px 20px`
- padding การ์ด KPI: `14px 16px`
- padding แถวย่อยในการ์ด: `11px 13px`
- padding เซลล์ตาราง: `11–13px 8px`
- padding ปุ่มหลัก: `11px 18px` · ปุ่มรอง: `11px 16px` · ปุ่มเล็ก: `7–9px 12–14px`
- padding ช่องกรอก: `10–11px 12–13px`

## มุมโค้ง

| ค่า | ใช้กับ |
| --- | --- |
| `20px` | การ์ดหลัก |
| `22px` | ภาพ hero |
| `18px` | การ์ด KPI |
| `16px` | กล่องเน้น |
| `14–15px` | กล่องย่อยในการ์ด |
| `13px` | รายการในแถบข้าง |
| `11–12px` | ช่องกรอก ปุ่ม |
| `10px` | แท็บ |
| `8–9px` | ปุ่มไอคอน |
| `999px` | chip · แถบความคืบหน้า |

## เงา

- การ์ด: `0 1px 3px rgba(20,40,80,.05)`
- ปุ่มหลัก: `0 6px 16px rgba(8,145,178,.25)`
- การ์ดลอย (โต๊ะบนผังห้อง): `0 10px 24px rgba(0,0,0,.35)`

---

## Component patterns

### แถบเครื่องมือหัวหน้าจอ
```
[breadcrumb 12.5px muted]
[หัวข้อ 24px/700] ......................... [ปุ่มรอง] [ปุ่มรอง] [ปุ่มหลัก]
```

### แถบแท็บย่อย
พื้น `#ffffff` · border `#e3e9f2` · radius `14px` · padding `6px` · gap `8px`
แท็บที่เลือก: overlay absolute `rgba(8,145,178,.12)` + border `rgba(8,145,178,.38)` radius `10px`
รูปแบบชื่อแท็บ: `N · ชื่อแท็บ`

### การ์ด KPI
```
[ป้าย 12.5px muted]
[ตัวเลข 26–36px/700 IBM Plex Sans สีตามสถานะ]
[คำอธิบาย 11.5px muted]
```

### Chip สถานะ
```
padding: 4–5px 10–11px
border-radius: 999px
font-size: 11–11.5px
background: rgba(<RGB>, .1)
border: 1px solid rgba(<RGB>, .35)
color: <สีข้อความของสถานะนั้น>
```

### ตาราง
```
width:100%; border-collapse:collapse; font-size:13px
thead th — padding 11–12px 8px · font-weight 500 · color #68788e · font-size 12px · text-align left
tbody tr — border-top 1px solid #edf1f7
td — padding 11–13px 8px
แถวรวม — border-top 2px solid #dde5f0 · background #f8fafc · ตัวหนา
```

### ปุ่มจัดการในตาราง (แก้/ลบ/ลากเรียง)
ปุ่มสี่เหลี่ยม `26×26px` radius `8px` วางชิดขวาสุด gap `7px`
- แก้ไข `✎` — border `#dde5f0` พื้น `#f8fafc` สี `#54637a`
- ลบ `🗑` — border `rgba(220,38,38,.3)` พื้น `#fff5f5` สี `#b91c1c`
- ลบที่ถูกล็อก — border `#e3e9f2` พื้น `#f4f7fb` สี `#c9d4e3` cursor `not-allowed` พร้อม tooltip บอกเหตุผล
- ลากเรียง `⠿` — สี `#a3b0c2` cursor `grab`

### แถวเพิ่มรายการท้ายตาราง
`<td colspan="ทั้งหมด">` ภายในเป็นกล่องกรอบประ `#cfd9e8` พื้น `#fbfcfe` มีเครื่องหมาย `＋` สี `#0e7490` และข้อความอธิบายว่าต้องกรอกอะไร

### สวิตช์เปิด/ปิด
ราง `30×17px` radius `999px` · เปิด `#0891b2` ปิด `#e3e9f2` · ปุ่มกลม `13×13px` สีขาว ห่างขอบ `2px`

### แถบความคืบหน้า
ราง `height 6–9px` radius `99px` พื้น `#eef2f7` · แท่งสีตามสถานะ

### กล่องข้อความเตือน
```
padding: 12px 14px · radius: 13–14px · font-size: 12.5px
สำเร็จ  — border rgba(5,150,105,.3)   พื้น #f0fdf4 ข้อความ #047857
คำเตือน — border rgba(194,130,10,.3)  พื้น #fffaf5 ข้อความ #92400e
อันตราย — border rgba(220,38,38,.26)  พื้น #fff5f5 ข้อความ #b91c1c
ข้อมูล  — border rgba(8,145,178,.3)   พื้น #f0fbfe ข้อความ #0e7490
บริษัท  — border rgba(124,58,237,.3)  พื้น #faf7ff ข้อความ #6d28d9
```

### Avatar
วงกลม `24–28px` · พื้น `rgba(<accent>,.12–.25)` · border `1px solid rgb(<accent>)` · ตัวย่อชื่อ 2 อักษร `9.5–10.5px/700` IBM Plex Sans
จุดออนไลน์: วงกลม `6–7px` `#34d399` border 1.5px สีพื้นหลัง วางมุมขวาล่าง
ซ้อนกลุ่ม: `margin-left: -7px` ตั้งแต่ตัวที่สองเป็นต้นไป

## Layout

- ความกว้างออกแบบ: `1920px`
- แถบเมนูซ้าย: `264px` (fixed)
- แถบข้อมูลขวาในหน้าเนื้อหา: `404px` (fixed) · เนื้อหาหลัก `flex:1; min-width:0`
- ภาพผังห้องหน้าภาพรวม: สูง `520px`

## Animation

```css
@keyframes omPulse  { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes omRing   { 0%{transform:scale(1);opacity:.9} 100%{transform:scale(2.1);opacity:0} }
@keyframes omScan   { 0%{transform:translateY(0)} 100%{transform:translateY(520px)} }
@keyframes omSpin   { to{transform:rotate(360deg)} }
@keyframes omPop    { 0%{opacity:0;transform:scale(.4)} 60%{transform:scale(1.12)} 100%{opacity:1;transform:scale(1)} }
@keyframes omTicket { 0%{opacity:0;transform:translateY(14px)} 6%,28%{opacity:1;transform:translateY(0)} 34%,100%{opacity:0;transform:translateY(-14px)} }
```
ต้องมีสวิตช์ปิดอนิเมชันทั้งหมด (คลาส `.om-static *{animation:none!important}`) และควรเคารพ `prefers-reduced-motion` ด้วย

hover ทั่วไป: พื้นเปลี่ยนเป็น `rgba(20,50,90,.05)` → `rgba(20,50,90,.09)` สำหรับปุ่มรอง
