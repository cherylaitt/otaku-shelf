import { create } from 'zustand';
import { gachaRepository } from '../../../shared/db/repositories/gachaRepository';
import { environmentsRepository } from '../../../shared/db/repositories/environmentsRepository';
import { useEnvironmentsStore } from '../../../shared/store/useEnvironmentsStore';
import { getAdService } from '../../../shared/services/adService';
import { Category, Environment, GachaPullLog } from '../../../shared/types/models';
import { drawEnvironment } from '../gachaLogic';

export interface GachaResult {
  environment: Environment;
  wasNewUnlock: boolean;
}

interface GachaState {
  /** Independent loading flags so Paper and Figure pulls never block each other. */
  pullingByCategory: Record<Category, boolean>;
  lastResultByCategory: Record<Category, GachaResult | null>;
  historyByCategory: Record<Category, GachaPullLog[]>;
  refreshHistory: (category: Category) => void;
  pull: (category: Category) => Promise<GachaResult | null>;
  clearLastResult: (category: Category) => void;
}

export const useGachaStore = create<GachaState>((set, get) => ({
  pullingByCategory: { paper: false, figure: false },
  lastResultByCategory: { paper: null, figure: null },
  historyByCategory: { paper: [], figure: [] },

  refreshHistory: (category) => {
    const history = gachaRepository.listByCategory(category);
    set((s) => ({ historyByCategory: { ...s.historyByCategory, [category]: history } }));
  },

  pull: async (category) => {
    if (get().pullingByCategory[category]) return null;
    set((s) => ({ pullingByCategory: { ...s.pullingByCategory, [category]: true } }));

    try {
      const ad = getAdService();
      const adResult = await ad.showRewardedAd();
      if (!adResult.rewarded) return null;

      const pool = environmentsRepository.listByCategory(category);
      const won = drawEnvironment(pool);
      const wasNewUnlock = !won.isUnlocked && environmentsRepository.unlock(won.id);

      gachaRepository.log({
        timestamp: Date.now(),
        category,
        resultEnvironmentId: won.id,
        wasNewUnlock,
      });

      // Re-fetch so `isUnlocked`/`unlockedAt` reflect the just-applied unlock.
      const refreshedEnv = environmentsRepository.getById(won.id) ?? won;
      const result: GachaResult = { environment: refreshedEnv, wasNewUnlock };

      useEnvironmentsStore.getState().refresh();
      get().refreshHistory(category);
      set((s) => ({ lastResultByCategory: { ...s.lastResultByCategory, [category]: result } }));

      return result;
    } finally {
      set((s) => ({ pullingByCategory: { ...s.pullingByCategory, [category]: false } }));
    }
  },

  clearLastResult: (category) => {
    set((s) => ({ lastResultByCategory: { ...s.lastResultByCategory, [category]: null } }));
  },
}));
