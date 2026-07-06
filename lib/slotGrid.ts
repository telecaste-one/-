// Isomorphic (server + browser) slot-availability logic. Kept dependency-free
// so the exact same rules run in the booking UI (optimistic rendering) and
// on the server (source-of-truth validation at booking time).

export type SlotOverrideRow = { trainerId: string; date: string; time: string; isOpen: boolean };
export type BookedSlotRow = { trainerId: string; date: string; time: string };

export type AvailabilityGrid = {
  isOpen(trainerId: string, date: string, time: string): boolean;
  isBooked(trainerId: string, date: string, time: string): boolean;
  isBookable(trainerId: string, date: string, time: string): boolean;
};

function slotKey(trainerId: string, date: string, time: string) {
  return `${trainerId}|${date}|${time}`;
}

// A slot with no override row defaults to open — the store only needs to
// persist exceptions ("turn this one off"), not a full open/closed matrix.
export function buildAvailabilityGrid(overrides: SlotOverrideRow[], booked: BookedSlotRow[]): AvailabilityGrid {
  const overrideMap = new Map<string, boolean>();
  for (const o of overrides) overrideMap.set(slotKey(o.trainerId, o.date, o.time), o.isOpen);

  const bookedSet = new Set<string>();
  for (const b of booked) bookedSet.add(slotKey(b.trainerId, b.date, b.time));

  const isOpen = (trainerId: string, date: string, time: string) =>
    overrideMap.get(slotKey(trainerId, date, time)) ?? true;
  const isBooked = (trainerId: string, date: string, time: string) => bookedSet.has(slotKey(trainerId, date, time));

  return {
    isOpen,
    isBooked,
    isBookable: (trainerId, date, time) => isOpen(trainerId, date, time) && !isBooked(trainerId, date, time),
  };
}
