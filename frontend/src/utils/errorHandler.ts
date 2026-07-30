import { AxiosError } from 'axios';

const ERROR_MESSAGES: Record<number, string> = {
  400: 'คำขอไม่ถูกต้อง',
  403: 'คุณไม่มีสิทธิ์เข้าถึง',
  404: 'ไม่พบข้อมูลที่ขอ',
  409: 'ข้อมูลซ้ำกับที่มีอยู่ในระบบ',
  422: 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
  429: 'มีการเรียกใช้งานมากเกินไป กรุณารอสักครู่',
  500: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
  503: 'เซิร์ฟเวอร์ไม่พร้อมให้บริการ',
};

export function extractApiError(err: unknown, fallback?: string): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const data = err.response?.data as any;

    if (data?.message) return data.message;
    if (data?.error) return data.error;

    if (status && ERROR_MESSAGES[status]) return ERROR_MESSAGES[status];
    if (err.code === 'ECONNABORTED') return 'การเชื่อมต่อหมดเวลา กรุณาลองอีกครั้ง';
    if (err.code === 'ERR_NETWORK') return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบเครือข่าย';
  }

  if (err instanceof Error) return err.message;
  return fallback || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
}
