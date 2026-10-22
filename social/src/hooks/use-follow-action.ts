import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';

/** Keep repeated taps from issuing conflicting follow requests. */
export function useFollowAction() {
  const pending = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState(new Set<string>());

  const toggleFollow = useCallback(async (userId: string) => {
    const state = useAppStore.getState();
    if (!state.currentUser || pending.current.has(userId)) return;
    pending.current.add(userId);
    setPendingIds(new Set(pending.current));
    try {
      const follows = state.currentUser.followingIds?.includes(userId)
        || state.currentUser.pendingFollowIds?.includes(userId);
      await (follows ? state.unfollowUser(userId) : state.followUser(userId));
    } finally {
      pending.current.delete(userId);
      setPendingIds(new Set(pending.current));
    }
  }, []);

  return { toggleFollow, pendingIds };
}
