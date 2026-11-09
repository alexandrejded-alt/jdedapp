export type AccountStatus = 'pending' | 'approved' | 'refused';
export type AccountRole = 'user' | 'admin';

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: AccountStatus;
  role: AccountRole;
  avatar_path: string | null;
  created_at: string;
};

export type Slot = {
  id: string;
  start_at: string;
  end_at: string;
  is_booked: boolean;
};

export type EventRow = {
  id: string;
  title: string;
  date: string; // AAAA-MM-JJ
  start_time: string; // HH:MM:SS
  end_time: string | null;
  place: string;
  capacity: number;
  rules: string;
  seats_taken: number;
};

export type PersonName = { first_name: string; last_name: string; email?: string; avatar_path?: string | null } | null;

export const fullName = (p: PersonName | undefined): string =>
  p ? `${p.first_name} ${p.last_name}`.trim() || 'Client' : 'Client';
