import { create } from 'zustand';
import { CreateItemInput, itemsRepository, UpdateItemInput } from '../../../shared/db/repositories/itemsRepository';
import { Item, ItemStatus } from '../../../shared/types/models';
import { imageService } from '../../../shared/services/imageService';

interface ItemsState {
  items: Item[];
  loaded: boolean;
  refresh: () => void;
  addItem: (input: CreateItemInput) => Item;
  updateItem: (id: string, patch: UpdateItemInput) => Item;
  removeItem: (id: string) => void;
  setStatus: (id: string, status: ItemStatus) => Item;
  placeInSlot: (itemId: string, row: number, col: number) => Item;
  removeFromSlot: (itemId: string) => Item;
}

/**
 * Holds the full item set in memory (personal collections are small — low
 * hundreds of rows at most) and always re-syncs from SQLite after a write so
 * multi-row side effects (like slot swaps) never fall out of sync with the
 * UI.
 */
export const useItemsStore = create<ItemsState>((set) => ({
  items: [],
  loaded: false,

  refresh: () => set({ items: itemsRepository.listAll(), loaded: true }),

  addItem: (input) => {
    const item = itemsRepository.create(input);
    set({ items: itemsRepository.listAll() });
    return item;
  },

  updateItem: (id, patch) => {
    const updated = itemsRepository.update(id, patch);
    set({ items: itemsRepository.listAll() });
    return updated;
  },

  removeItem: (id) => {
    const existing = itemsRepository.getById(id);
    itemsRepository.remove(id);
    imageService.deletePhoto(existing?.imageUri);
    set({ items: itemsRepository.listAll() });
  },

  setStatus: (id, status) => {
    const updated = itemsRepository.setStatus(id, status);
    set({ items: itemsRepository.listAll() });
    return updated;
  },

  placeInSlot: (itemId, row, col) => {
    const updated = itemsRepository.placeInSlot(itemId, row, col);
    set({ items: itemsRepository.listAll() });
    return updated;
  },

  removeFromSlot: (itemId) => {
    const updated = itemsRepository.removeFromSlot(itemId);
    set({ items: itemsRepository.listAll() });
    return updated;
  },
}));
