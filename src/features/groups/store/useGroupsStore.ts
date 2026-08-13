import { create } from 'zustand';
import { CreateGroupInput, groupsRepository } from '../../../shared/db/repositories/groupsRepository';
import { itemsRepository } from '../../../shared/db/repositories/itemsRepository';
import { Group } from '../../../shared/types/models';
import { useItemsStore } from '../../items/store/useItemsStore';

interface GroupsState {
  groups: Group[];
  loaded: boolean;
  refresh: () => void;
  createGroup: (input: CreateGroupInput) => Group;
  deleteGroup: (id: string) => void;
  updateGroupDetails: (id: string, patch: { name?: string; description?: string | null }) => void;
  resizeGroup: (id: string, rows: number, columns: number) => Group;
  setActiveEnvironment: (groupId: string, environmentId: string) => void;
  getGroupById: (id: string) => Group | undefined;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  loaded: false,

  refresh: () => set({ groups: groupsRepository.listAll(), loaded: true }),

  createGroup: (input) => {
    const group = groupsRepository.create(input);
    set((s) => ({ groups: [group, ...s.groups] }));
    return group;
  },

  deleteGroup: (id) => {
    groupsRepository.remove(id);
    set((s) => ({ groups: s.groups.filter((g) => g.id !== id) }));
  },

  updateGroupDetails: (id, patch) => {
    const updated = groupsRepository.updateDetails(id, patch);
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? updated : g)) }));
  },

  /**
   * Composes the two repositories that own the two halves of a resize:
   * `groupsRepository` for the group's own `rows`/`columns`, and
   * `itemsRepository.reflowForGroup` for repacking that group's placed
   * items into the new dimensions. Kept here (rather than having either
   * repository import the other) to avoid a groups<->items repository
   * import cycle — `itemsRepository` already imports `groupsRepository`
   * for its own category checks.
   */
  resizeGroup: (id, rows, columns) => {
    const updated = groupsRepository.resize(id, rows, columns);
    itemsRepository.reflowForGroup(id, rows, columns);
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? updated : g)) }));
    useItemsStore.getState().refresh();
    return updated;
  },

  setActiveEnvironment: (groupId, environmentId) => {
    const updated = groupsRepository.setActiveEnvironment(groupId, environmentId);
    set((s) => ({ groups: s.groups.map((g) => (g.id === groupId ? updated : g)) }));
  },

  getGroupById: (id) => get().groups.find((g) => g.id === id),
}));
