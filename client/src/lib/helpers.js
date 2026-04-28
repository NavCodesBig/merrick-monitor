// ── Time formatting ───────────────────────────────────────────

export function formatHour(hour) {
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}

export function formatHourShort(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

// ── Meal times ────────────────────────────────────────────────

export const MEAL_TIMES = {
  7:  { name: 'Breakfast',         color: 'bg-yellow-50 border-yellow-400',   textColor: 'text-yellow-800',   bannerBg: 'bg-yellow-400' },
  10: { name: 'Morning Snack',     color: 'bg-orange-50 border-orange-300',   textColor: 'text-orange-800',   bannerBg: 'bg-orange-300' },
  12: { name: 'Lunch',             color: 'bg-green-50 border-green-400',     textColor: 'text-green-800',    bannerBg: 'bg-green-500'  },
  15: { name: 'Afternoon Snack',   color: 'bg-orange-50 border-orange-300',   textColor: 'text-orange-800',   bannerBg: 'bg-orange-300' },
  18: { name: 'Dinner',            color: 'bg-purple-50 border-purple-400',   textColor: 'text-purple-800',   bannerBg: 'bg-purple-500' },
};

export function getMealInfo(hour) {
  return MEAL_TIMES[hour] ?? null;
}

// ── Blood glucose helpers ─────────────────────────────────────

export function getBgStatus(bg, min = 70, max = 180) {
  if (!bg) return 'none';
  if (bg > max) return 'high';
  if (bg < min) return 'low';
  return 'normal';
}

export function getBgRowClass(bg, min = 70, max = 180) {
  const status = getBgStatus(bg, min, max);
  if (status === 'high') return 'bg-red-50 border-l-4 border-red-400';
  if (status === 'low')  return 'bg-blue-50 border-l-4 border-blue-500';
  return 'bg-white border-l-4 border-transparent';
}

export function getBgBadgeClass(bg, min = 70, max = 180) {
  const status = getBgStatus(bg, min, max);
  if (status === 'high') return 'bg-red-100 text-red-700 font-semibold';
  if (status === 'low')  return 'bg-blue-100 text-blue-700 font-semibold';
  if (status === 'normal') return 'bg-green-100 text-green-700 font-semibold';
  return 'bg-gray-100 text-gray-600';
}

// ── Event types ───────────────────────────────────────────────

export const EVENT_TYPES = [
  { value: 'none',          label: 'None' },
  { value: 'routine_check', label: 'Routine Check' },
  { value: 'meal',          label: 'Meal' },
  { value: 'snack',         label: 'Snack' },
  { value: 'high_bg',       label: 'High BG' },
  { value: 'low_bg',        label: 'Low BG' },
];

export const EVENT_LABELS = Object.fromEntries(EVENT_TYPES.map(e => [e.value, e.label]));

export const EVENT_BADGE_COLORS = {
  none:          'bg-gray-100 text-gray-600',
  routine_check: 'bg-blue-100 text-blue-700',
  meal:          'bg-green-100 text-green-700',
  snack:         'bg-orange-100 text-orange-700',
  high_bg:       'bg-red-100 text-red-700',
  low_bg:        'bg-blue-100 text-blue-800',
};

// ── Offline queue ─────────────────────────────────────────────

const QUEUE_KEY = 'mm_offline_queue';

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function pushToOfflineQueue(op) {
  const queue = getOfflineQueue();
  queue.push({ ...op, queuedAt: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export async function flushOfflineQueue(supabase) {
  const queue = getOfflineQueue();
  if (!queue.length) return;

  const failed = [];
  for (const op of queue) {
    try {
      if (op.type === 'upsert') {
        const { error } = await supabase.from(op.table).upsert(op.data, op.options ?? {});
        if (error) failed.push(op);
      } else if (op.type === 'delete') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.id);
        if (error) failed.push(op);
      }
    } catch {
      failed.push(op);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  return { processed: queue.length - failed.length, failed: failed.length };
}

// ── Misc ──────────────────────────────────────────────────────

export const CABIN_NAMES = ['Seminole', 'Mohawk', 'Iroquois', 'Cherokee', 'Conoy'];
export const WEEKS = [1, 2, 3];
export const DAYS = [1, 2, 3, 4, 5, 6, 7];
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function camperDisplayName(camper) {
  return `${camper.first_name} ${camper.last_name}`;
}

export function generateId() {
  return crypto.randomUUID();
}
