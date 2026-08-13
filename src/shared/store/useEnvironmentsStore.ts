import { create } from 'zustand';
import { environmentsRepository } from '../db/repositories/environmentsRepository';
import { Environment } from '../types/models';

interface EnvironmentsState {
  environments: Environment[];
  loaded: boolean;
  refresh: () => void;
  getById: (id: string) => Environment | undefined;
}

/**
 * Shared across the Gacha feature (draw pool + unlock writes) and the Shelf
 * feature's Skin Locker (browsing + equipping), since both operate on the
 * same Environment catalog.
 */
export const useEnvironmentsStore = create<EnvironmentsState>((set, get) => ({
  environments: [],
  loaded: false,
  refresh: () => set({ environments: environmentsRepository.listAll(), loaded: true }),
  getById: (id) => get().environments.find((e) => e.id === id),
}));
