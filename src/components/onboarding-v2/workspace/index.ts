export { SavedLeadsTab } from './SavedLeadsTab';
export { SettingsTab } from './SettingsTab';

// Map-compatible prospect type for map markers
export interface Prospect {
  id: string;
  name: string;
  score: number;
  lat?: number;
  lng?: number;
}