import { api } from '@/api/client';

/**
 * AI-Powered Topic Classification
 * Automatically categorizes content and detects themes
 */
export const TopicClassifier = {
  /**
   * Classify poll content using LLM
   */
  async classifyPoll(pollQuestion, pollDescription) {
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze this poll and classify it:
        
Question: ${pollQuestion}
Description: ${pollDescription || "No description"}

1. Select the most appropriate category from: politics_society, environment, economy_work, technology_innovation, health, lifestyle_culture, sports, other
2. Extract 3-5 relevant topic tags
3. Assess if this is sensitive content (NSFW)
4. Rate the clarity and quality of the question (1-10)

Be concise and accurate.`,
        response_json_schema: {
          type: "object",
          properties: {
            category: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            is_nsfw: { type: "boolean" },
            quality_score: { type: "number" },
            reasoning: { type: "string" },
          },
        },
      });

      return result;
    } catch (error) {
      console.error("Topic classification failed:", error);
      return {
        category: "other",
        tags: [],
        is_nsfw: false,
        quality_score: 5,
        reasoning: "Classification unavailable",
      };
    }
  },

  /**
   * Analyze petition content
   */
  async classifyPetition(title, description, requestedAction) {
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze this petition:
        
Title: ${title}
Description: ${description}
Requested Action: ${requestedAction}

1. Select category: government_policy, local_council, corporate_policy, human_rights, environment, health, economy, technology, education, other
2. Extract 3-5 relevant tags
3. Identify target type: national_government, local_council, corporation, regulatory_body, international_org, other
4. Assess risk level: low, medium, high (based on legal/safety concerns)
5. Rate urgency: low, medium, high, critical`,
        response_json_schema: {
          type: "object",
          properties: {
            category: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            target_type: { type: "string" },
            risk_level: { type: "string" },
            urgency: { type: "string" },
          },
        },
      });

      return result;
    } catch (error) {
      console.error("Petition classification failed:", error);
      return {
        category: "other",
        tags: [],
        target_type: "other",
        risk_level: "low",
        urgency: "medium",
      };
    }
  },

  /**
   * Detect trending topics across platform
   */
  async detectTrendingTopics(polls) {
    const topicCounts = {};
    
    polls.forEach((poll) => {
      if (poll.tags) {
        poll.tags.forEach((tag) => {
          topicCounts[tag] = (topicCounts[tag] || 0) + (poll.total_votes_cached || 1);
        });
      }
    });

    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, score]) => ({ topic, score }));
  },
};