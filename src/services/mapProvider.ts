import { FamilyMember } from '../types/domain';

export type TrafficIncident = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  severity: 'low' | 'moderate' | 'high';
};

export interface MapProvider {
  showMembers(members: FamilyMember[]): Promise<void>;
  centerOnMember(memberId: string): Promise<void>;
  loadTraffic(bounds: [number, number, number, number]): Promise<void>;
  loadIncidents(bounds: [number, number, number, number]): Promise<TrafficIncident[]>;
  calculateRoute(origin: [number, number], destination: [number, number]): Promise<void>;
}

export const azureMapsConfig = {
  tokenEndpoint: process.env.EXPO_PUBLIC_AZURE_MAPS_TOKEN_ENDPOINT,
  clientId: process.env.EXPO_PUBLIC_AZURE_MAPS_CLIENT_ID,
  configured: Boolean(
    process.env.EXPO_PUBLIC_AZURE_MAPS_TOKEN_ENDPOINT &&
      process.env.EXPO_PUBLIC_AZURE_MAPS_CLIENT_ID,
  ),
};
