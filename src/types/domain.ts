export type ActivityState =
  | 'walking'
  | 'running'
  | 'driving'
  | 'stopped'
  | 'offline';

export type FamilyMember = {
  id: string;
  name: string;
  initials: string;
  relation: string;
  activity: ActivityState;
  activityLabel: string;
  placeLabel: string;
  lastSeenLabel: string;
  battery: number;
  etaMinutes?: number;
  latitude: number;
  longitude: number;
};

export type QuickAction = 'check-in' | 'meet' | 'call' | 'message';
