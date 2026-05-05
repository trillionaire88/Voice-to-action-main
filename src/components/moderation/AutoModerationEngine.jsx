import { api } from '@/api/client';

/**
 * Automated Moderation Engine
 * Detects violations and flags content for review
 */
export const AutoModerationEngine = {
  /**
   * Analyze content for violations using AI
   */
  async analyzeContent(content, contentType) {
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze this ${contentType} for policy violations:

Content: "${content}"

Check for:
1. Hate speech or discrimination
2. Harassment or bullying
3. Violence or threats
4. Misinformation (if verifiable)
5. Spam or scams
6. Self-harm content
7. Illegal activity

Rate severity: none, low, medium, high, critical
Provide specific violation types and reasoning.`,
        response_json_schema: {
          type: "object",
          properties: {
            severity: { type: "string" },
            violations: { type: "array", items: { type: "string" } },
            requires_review: { type: "boolean" },
            auto_action: { type: "string" },
            reasoning: { type: "string" },
          },
        },
      });

      return result;
    } catch (error) {
      console.error("Auto-moderation analysis failed:", error);
      return {
        severity: "none",
        violations: [],
        requires_review: false,
        auto_action: "none",
        reasoning: "Analysis unavailable",
      };
    }
  },

  /**
   * Detect coordinated behavior patterns
   */
  async detectCoordination(userId) {
    try {
      const recentVotes = await api.entities.Vote.filter(
        { user_id: userId },
        "-created_date",
        100
      );

      // Check for suspicious patterns
      const timeWindows = this.analyzeTimingPatterns(recentVotes);
      const ipPatterns = await this.analyzeNetworkPatterns(userId);

      const riskScore = this.calculateRiskScore(timeWindows, ipPatterns);

      if (riskScore > 70) {
        // Flag for review
        await api.entities.NetworkRiskScore.create({
          user_id: userId,
          risk_score: riskScore,
          coordination_detected: true,
          timing_anomaly_score: timeWindows.anomalyScore,
          last_evaluation: new Date().toISOString(),
        });
      }

      return { riskScore, requiresReview: riskScore > 50 };
    } catch (error) {
      console.error("Coordination detection failed:", error);
      return { riskScore: 0, requiresReview: false };
    }
  },

  analyzeTimingPatterns(votes) {
    if (votes.length < 10) return { anomalyScore: 0 };

    const timestamps = votes.map((v) => new Date(v.created_date).getTime());
    const intervals = [];

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;

    // Low variance = suspicious uniformity
    const anomalyScore = variance < 1000 ? 80 : 20;

    return { anomalyScore, avgInterval, variance };
  },

  async analyzeNetworkPatterns(_userId) {
    // Placeholder for IP/network analysis
    return { suspicious: false, score: 0 };
  },

  calculateRiskScore(timing, network) {
    return Math.min(100, timing.anomalyScore * 0.6 + network.score * 0.4);
  },

  /**
   * Auto-flag suspicious polls
   */
  async flagSuspiciousPoll(pollId) {
    try {
      const poll = (await api.entities.Poll.filter({ id: pollId }))[0];
      if (!poll) return;

      const analysis = await this.analyzeContent(
        `${poll.question} ${poll.description}`,
        "poll"
      );

      if (analysis.severity === "high" || analysis.severity === "critical") {
        await api.entities.Report.create({
          reporter_user_id: "system",
          target_type: "poll",
          target_id: pollId,
          reason: analysis.violations[0] || "automated_flag",
          comments: `Auto-flagged: ${analysis.reasoning}`,
          priority: analysis.severity === "critical" ? "critical" : "high",
        });

        if (analysis.auto_action === "remove") {
          await api.entities.Poll.update(pollId, {
            status: "removed",
            removal_reason_code: analysis.violations[0],
            visibility_limited: true,
          });
        }
      }

      return analysis;
    } catch (error) {
      console.error("Auto-flag failed:", error);
    }
  },
};