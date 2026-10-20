export const DAY_MS = 60_000;

export type DayClock = {
  label: string;
  secondsLeft: number;
  progress: number;
  urgent: boolean;
};

export function dayClock(dayEndsAt: string, now: number): DayClock {
  const end = Date.parse(dayEndsAt);
  const remaining = Number.isFinite(end) ? Math.max(0, end - now) : DAY_MS;
  const elapsed = DAY_MS - Math.min(DAY_MS, remaining);
  const minuteOfDay = Math.min(24 * 60 - 1, Math.floor((elapsed / DAY_MS) * 24 * 60));
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const secondsLeft = Math.ceil(remaining / 1000);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return {
    label: `${hh}:${mm}`,
    secondsLeft,
    progress: Math.min(100, (elapsed / DAY_MS) * 100),
    urgent: secondsLeft <= 10,
  };
}
