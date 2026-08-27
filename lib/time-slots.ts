import { useEffect, useState } from "react";

export type RestaurantHours = { opensAt: string; closesAt: string };

export const timeSlotStepMinutes = 15;
export const minLeadMinutes = 20;

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatHM(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function toMinutesOfDay(hm: string) {
  const [hours, minutes] = hm.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function buildTimeSlots(min: string, max: string, stepMinutes = timeSlotStepMinutes) {
  const minMinutes = toMinutesOfDay(min);
  const maxMinutes = toMinutesOfDay(max);
  const slots: string[] = [];
  for (let t = Math.ceil(minMinutes / stepMinutes) * stepMinutes; t <= maxMinutes; t += stepMinutes) {
    slots.push(`${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`);
  }
  return slots;
}

/** Interprets an "HH:mm" wall-clock string as a moment today, in the caller's local time. */
export function timeOfDayToDate(hm: string, base = new Date()) {
  const [hours, minutes] = hm.split(":").map(Number);
  const date = new Date(base);
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date;
}

/** Round up so a 10:00 slot never becomes 09:59:xx when sent as relative minutes. */
export function minutesUntilTimeOfDay(hm: string, now = new Date()) {
  return Math.ceil((timeOfDayToDate(hm, now).getTime() - now.getTime()) / 60_000);
}

/** The same slot list guests use to pick a time: 15-minute steps, bounded by opening hours and a minimum lead time. */
export function useTimeSlots(hours: RestaurantHours) {
  const [minTime, setMinTime] = useState("");
  useEffect(() => {
    const earliest = formatHM(new Date(Date.now() + minLeadMinutes * 60_000));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Date.now() is an external, time-varying input.
    setMinTime(earliest > hours.opensAt ? earliest : hours.opensAt);
  }, [hours.opensAt]);
  const slots = minTime === "" ? [] : buildTimeSlots(minTime, hours.closesAt);
  return { minTime, slots };
}
