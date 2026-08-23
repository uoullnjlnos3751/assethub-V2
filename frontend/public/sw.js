/**
 * Service worker — เอาไว้ให้เปิดแอปได้ตอนเน็ตหลุด ไม่ใช่เอาไว้เร่งความเร็ว
 *
 * ของเดิมเป็น cache-first กับทุกคำขอที่ไม่ใช่การเปิดหน้า และ CACHE_NAME ถูก
 * ฮาร์ดโค้ดไว้ค่าเดียวตลอด ตัว activate จึงลบแคชเก่าไม่ได้เลยเพราะชื่อไม่เคยต่าง
 * ผลคือ deploy ใหม่แล้วเครื่องที่เคยเปิดแอปไว้ยังเห็นของเก่า และไม่มีอะไรใน
 * ระบบบอกว่ากำลังเห็นของเก่าอยู่
 *
 * เปลี่ยนเป็น network-first สำหรับไฟล์ของแอปเอง แคชเป็นแค่ตัวสำรองตอนออฟไลน์
 * โค้ดที่ deploy แล้วจึงชนะแคชเสมอ ซึ่งสำคัญกว่าการโหลดเร็วขึ้นเสี้ยววินาที —
 * deploy ที่ผู้ใช้มองไม่เห็นเท่ากับยังไม่ได้ deploy
 */

/* ผูกกับเวลา build — ทุกครั้งที่ build ใหม่ ชื่อจะเปลี่ยน activate จึงลบของเก่าได้จริง */
const CACHE_NAME = 'assethub-v3-__BUILD_ID__';
const PRECACHE = ['/manifest.json', '/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // แคชได้เฉพาะ GET ของโดเมนตัวเอง — POST/PUT เอาไปแคชไม่ได้อยู่แล้ว
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* API กับไฟล์อัปโหลดต้องสดเสมอ ปล่อยผ่านไปหาเครือข่ายตรง ๆ ไม่แตะแคชเลย
     ข้อมูลทะเบียนที่ค้างอยู่ในแคชอันตรายกว่าการโหลดช้า */
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        // เก็บสำเนาไว้เผื่อออฟไลน์ เฉพาะที่ตอบสำเร็จจริง
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req.mode === 'navigate' ? '/index.html' : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? '/index.html' : req)),
  );
});
