// 收藏服务（Specification §12.5：收藏列表 = favorites join knowledge，按收藏时间倒序）。
import type { Favorite } from '../core/favorite';
import type { Knowledge } from '../core/knowledge';
import { favoriteRepository, type FavoriteRepository } from '../repositories/favoriteRepository';
import { knowledgeRepository, type KnowledgeRepository } from '../repositories/knowledgeRepository';

export interface FavoriteItem {
  readonly favorite: Favorite;
  readonly knowledge: Knowledge;
}

export interface FavoriteServiceDeps {
  favoriteRepository: FavoriteRepository;
  knowledgeRepository: KnowledgeRepository;
}

export function createFavoriteService(deps: FavoriteServiceDeps) {
  return {
    async getFavorites(userId: string): Promise<FavoriteItem[]> {
      const favorites = await deps.favoriteRepository.listByUser(userId);
      const knowledgeList = await deps.knowledgeRepository.listByIds(
        favorites.map((item) => item.knowledgeId),
      );
      const map = new Map(knowledgeList.map((item) => [item._id, item]));
      return favorites.flatMap((favorite) => {
        const knowledge = map.get(favorite.knowledgeId);
        // 知识点被删的孤儿收藏跳过（数据一致性兜底）
        return knowledge ? [{ favorite, knowledge }] : [];
      });
    },
  };
}

export const favoriteService = createFavoriteService({ favoriteRepository, knowledgeRepository });
