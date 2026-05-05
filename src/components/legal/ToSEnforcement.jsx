import { api } from '@/api/client';
import { CURRENT_TOS_VERSION } from "./ToSContent";

/**
 * Terms of Service Enforcement Engine
 * Checks ToS acceptance and enforces compliance
 */
export const ToSEnforcement = {
  /**
   * Check if user has accepted current ToS version
   */
  async hasAcceptedCurrentToS(userId) {
    try {
      const acceptances = await api.entities.TermsAcceptance.filter({
        user_id: userId,
        terms_version: CURRENT_TOS_VERSION,
      });

      return acceptances.length > 0;
    } catch (error) {
      console.error("ToS check failed:", error);
      return false;
    }
  },

  /**
   * Record ToS acceptance
   */
  async recordAcceptance(userId, method = "manual_review") {
    try {
      await api.entities.TermsAcceptance.create({
        user_id: userId,
        terms_version: CURRENT_TOS_VERSION,
        accepted_at: new Date().toISOString(),
        ip_address: "system_recorded",
        device_fingerprint: navigator.userAgent,
        acceptance_method: method,
      });

      await api.auth.updateMe({
        tos_accepted: true,
        tos_version_accepted: CURRENT_TOS_VERSION,
        tos_accepted_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Failed to record ToS acceptance:", error);
      return false;
    }
  },

  /**
   * Detect and flag IP violations
   */
  async flagIPViolation(userId, violationType, evidence) {
    try {
      await api.entities.PolicyViolation.create({
        user_id: userId,
        violation_type: violationType,
        severity: "critical",
        description: `IP violation detected: ${violationType}`,
        evidence: evidence || {},
        action_taken: "account_banned",
        detected_by: "automated",
      });

      // Immediate ban
      await api.auth.updateMe({
        account_status: "banned",
        ban_reason: "intellectual_property_violation",
        banned_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Failed to flag IP violation:", error);
      return false;
    }
  },

  /**
   * Detect suspicious scraping behavior
   */
  async detectScrapingAttempt(userId) {
    try {
      // Check for rapid sequential requests (placeholder for actual implementation)
      const recentActivity = await this.getUserRecentActivity(userId);
      
      if (recentActivity.requestsPerMinute > 30) {
        await api.entities.PolicyViolation.create({
          user_id: userId,
          violation_type: "content_scraping",
          severity: "high",
          description: "Abnormal request pattern detected - possible scraping attempt",
          evidence: { rpm: recentActivity.requestsPerMinute },
          action_taken: "warning",
          detected_by: "automated",
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error("Scraping detection failed:", error);
      return false;
    }
  },

  async getUserRecentActivity(userId) {
    // Placeholder - would integrate with actual request logs
    return { requestsPerMinute: 5 };
  },

  /**
   * Anti-cloning watermark verification
   */
  getDigitalWatermark() {
    // Hidden watermark embedded in DOM
    return {
      platform: "Voice to Action",
      version: CURRENT_TOS_VERSION,
      owner: "Jeremy Kyle Whisson",
      timestamp: Date.now(),
      signature: btoa(`EV-${Date.now()}-PROTECTED`),
    };
  },
};