import { localDb } from './database';
import { apiRequest } from './apiClient';
import { SyncMutation, PushMutationsResponse } from '@dingdong/contracts';

let isSyncing = false;

export const syncEngine = {
  isCurrentlySyncing(): boolean {
    return isSyncing;
  },

  async pushOutbox(): Promise<{ pushedCount: number; errorsCount: number }> {
    if (isSyncing) return { pushedCount: 0, errorsCount: 0 };
    isSyncing = true;

    try {
      const pending = localDb.getPendingMutations(50);
      if (pending.length === 0) return { pushedCount: 0, errorsCount: 0 };

      const mutations: SyncMutation[] = pending.map((p) => ({
        mutationId: p.mutationId,
        entityType: p.entityType as any,
        entityId: p.entityId,
        action: p.action,
        baseVersion: p.baseVersion,
        payload: JSON.parse(p.payloadJson),
      }));

      const res = await apiRequest<PushMutationsResponse>('/sync/mutations', {
        method: 'POST',
        body: JSON.stringify({ mutations }),
      });

      if (!res.data || !res.data.results) {
        return { pushedCount: 0, errorsCount: pending.length };
      }

      let pushed = 0;
      let errors = 0;

      for (const result of res.data.results) {
        if (result.status === 'applied' || result.status === 'duplicate') {
          localDb.removeOutboxMutation(result.mutationId);
          pushed += 1;
        } else if (result.status === 'conflict') {
          localDb.markOutboxConflict(
            result.mutationId,
            result.error?.message || 'Xung đột phiên bản'
          );
          errors += 1;
        }
      }

      return { pushedCount: pushed, errorsCount: errors };
    } finally {
      isSyncing = false;
    }
  },

  async pullSnapshot(): Promise<boolean> {
    const initRes = await apiRequest<{ snapshotId: string; totalCount: number }>(
      '/sync/snapshots',
      { method: 'POST' }
    );

    if (!initRes.data?.snapshotId) return false;

    const snapshotId = initRes.data.snapshotId;
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const pageUrl = `/sync/snapshots/${snapshotId}?limit=50${cursor ? `&cursor=${cursor}` : ''}`;
      const pageRes: { data?: { items: any[]; hasMore: boolean; nextCursor?: string } } = await apiRequest(pageUrl);

      if (!pageRes.data) break;

      hasMore = pageRes.data.hasMore;
      cursor = pageRes.data.nextCursor;
    }

    return true;
  },

  async syncAll(): Promise<{ pushed: number; errors: number; pullSuccess: boolean }> {
    const { pushedCount, errorsCount } = await this.pushOutbox();
    const pullSuccess = await this.pullSnapshot();
    return { pushed: pushedCount, errors: errorsCount, pullSuccess };
  },
};
