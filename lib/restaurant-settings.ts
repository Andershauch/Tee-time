import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { restaurantSettings } from "@/db/schema";
import { defaultRestaurantHours } from "@/lib/fixtures";

const settingsId = "default";
const restaurantTimeZone = "Europe/Copenhagen";

export { defaultRestaurantHours };
export type RestaurantHours = { opensAt: string; closesAt: string };

export async function getRestaurantHours(): Promise<RestaurantHours> {
  if (!process.env.DATABASE_URL) return defaultRestaurantHours;
  const [row] = await getDb().select().from(restaurantSettings).where(eq(restaurantSettings.id, settingsId)).limit(1);
  return row ? { opensAt: row.opensAt, closesAt: row.closesAt } : defaultRestaurantHours;
}

export async function updateRestaurantHours(hours: RestaurantHours) {
  await getDb().insert(restaurantSettings).values({ id: settingsId, ...hours }).onConflictDoUpdate({
    target: restaurantSettings.id,
    set: { opensAt: hours.opensAt, closesAt: hours.closesAt, updatedAt: sql`now()` },
  });
}

/** The restaurant's local wall-clock time as "HH:mm", independent of the server's runtime timezone. */
export function currentTimeOfDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: restaurantTimeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
}

export function isWithinOpeningHours(hours: RestaurantHours, at: Date) {
  const time = currentTimeOfDay(at);
  return time >= hours.opensAt && time <= hours.closesAt;
}
