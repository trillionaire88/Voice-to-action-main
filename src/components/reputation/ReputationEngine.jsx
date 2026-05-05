import { api } from '@/api/client';

/**
 * Client-side helper that triggers the backend reputation calculation.
 * Heavy lifting is done server-side in functions/calculateReputation.js
 */
export const ReputationEngine = {
  /**
   * Trigger a recalculation for any user (self) or any user (admin).
   * Returns { success, score } from the backend.
   */
  async recalculate(userId) {
    try {
      const response = await api.functions.invoke('calculateReputation', { user_id: userId });
      return response.data;
    } catch (error) {
      console.error("Reputation recalculation failed:", error);
      return null;
    }
  },

  /**
   * Get the stored influence score for a user from the entity.
   */
  async getScore(userId) {
    try {
      const records = await api.entities.UserInfluenceScore.filter({ user_id: userId });
      return records[0] || null;
    } catch {
      return null;
    }
  },

  /**
   * Map score to trust weight multiplier for use in petition/report ranking.
   * Score 0-100 → weight 0.5 to 2.0
   */
  getTrustWeight(score) {
    if (score == null) return 1.0;
    return 0.5 + (score / 100) * 1.5;
  },

  /**
   * Get influence level label from score.
   */
  getInfluenceLevel(score) {
    if (score >= 90) return { key: 'trusted_leader', label: 'Trusted Leader' };
    if (score >= 75) return { key: 'highly_trusted', label: 'Highly Trusted' };
    if (score >= 60) return { key: 'trusted_user', label: 'Trusted User' };
    if (score >= 40) return { key: 'standard_user', label: 'Standard User' };
    if (score >= 20) return { key: 'low_trust', label: 'Low Trust' };
    return { key: 'restricted_user', label: 'Restricted User' };
  },
};