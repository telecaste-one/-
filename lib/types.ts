import type { DateInfo } from "./dates";

export type TrainerDTO = { id: string; name: string; initial: string; photoUrl: string | null };

export type SlotOverrideDTO = { trainerId: string; date: string; time: string; isOpen: boolean };
export type BookedSlotDTO = { trainerId: string; date: string; time: string };

export type SlotsResponse = {
  dates: DateInfo[];
  times: string[];
  trainers: TrainerDTO[];
  overrides: SlotOverrideDTO[];
  booked: BookedSlotDTO[];
};

export type ReservationDTO = {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  phone: string | null;
  note: string | null;
  trainerId: string | null;
  trainerName: string;
  autoAssigned: boolean;
  planName: string;
  planCount: number;
  planPrice: string;
  single: boolean;
  date: string;
  time: string;
  endTime: string;
  status: string;
  source: string;
  createdAt: string;
};

export type MailPreview = { to: string; subject: string; lines: string[]; sent: boolean; error?: string };

export type CreateReservationResponse = {
  reservation: ReservationDTO;
  mail: { store: MailPreview; customer: MailPreview };
};

export type AdminSlot = { time: string; open: boolean; booked: boolean };

export type CustomerListItem = {
  id: string;
  name: string;
  email: string;
  visits: number;
  planName: string | null;
  next: { date: string; time: string; endTime: string; trainerName: string; planName: string } | null;
};

export type CustomerDetail = {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    since: string;
    visits: number;
    planName: string | null;
    remaining: number | null;
  };
  next: { date: string; time: string; endTime: string; trainerName: string; planName: string } | null;
  history: {
    id: string;
    date: string;
    time: string;
    trainerName: string;
    planName: string;
    status: string;
    dateLabel?: string;
  }[];
};
