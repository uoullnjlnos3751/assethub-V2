import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';

// Configure dayjs for Thai locale and Buddhist Era
dayjs.extend(buddhistEra);
dayjs.locale('th');

/**
 * Format date to Thai standard (e.g., 11 มิ.ย. 2569)
 */
export const formatDate = (dateStr: string | number | Date | null | undefined): string => {
  if (!dateStr) return '-';
  const d = dayjs(dateStr);
  if (!d.isValid()) return '-';
  return d.format('D MMM BBBB'); 
};

/**
 * Format date and time to Thai standard (e.g., 11 มิ.ย. 2569, 14:30 น.)
 */
export const formatDateTime = (dateStr: string | number | Date | null | undefined): string => {
  if (!dateStr) return '-';
  const d = dayjs(dateStr);
  if (!d.isValid()) return '-';
  return d.format('D MMM BBBB, HH:mm น.');
};
