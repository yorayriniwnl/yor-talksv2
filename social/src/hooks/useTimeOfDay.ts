import { useState, useEffect } from 'react';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Returns the current time-of-day segment.
 *
 * - morning:   5:00 – 11:59
 * - afternoon: 12:00 – 16:59
 * - evening:   17:00 – 20:59
 * - night:     21:00 – 4:59
 *
 * Updates every minute to stay accurate while the tab is open.
 */
export function useTimeOfDay(): TimeOfDay {
  const [time, setTime] = useState<TimeOfDay>(getTimeOfDay);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeOfDay());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/** Returns a human greeting based on the time of day. */
export function getGreeting(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return 'Good morning';
    case 'afternoon': return 'Good afternoon';
    case 'evening': return 'Good evening';
    case 'night': return 'Good night';
  }
}
