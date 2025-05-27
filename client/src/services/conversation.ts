import type { Scenario } from './pocketbase';
import { ollamaService } from './ollama';
import { config } from '../config';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class ConversationService {
  private messages: ConversationMessage[] = [];
  private scenario: Scenario | null = null;
  private useOllama: boolean = true; // Feature flag for easy toggling
  private conversationSummary: string | null = null;

  initialize(scenario: Scenario): void {
    this.scenario = scenario;
    this.messages = [];
    
    // Add the initial AI message
    if (scenario.initialMessage) {
      this.messages.push({
        role: 'assistant',
        content: scenario.initialMessage,
        timestamp: new Date()
      });
    }
  }

  addUserMessage(content: string): void {
    this.messages.push({
      role: 'user',
      content,
      timestamp: new Date()
    });
  }

  async getAIResponse(userInput: string): Promise<string> {
    if (!this.scenario) {
      return "I'm not sure what scenario we're practicing. Let's start over.";
    }

    try {
      if (this.useOllama && config.ollamaUrl && config.ollamaApiKey) {
        // Use Ollama for intelligent responses
        console.log('Using Ollama for AI response...');
        
        // Get optimized conversation history that fits within context window
        const optimizedHistory = await this.getOptimizedHistory();
        const conversationHistory = optimizedHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Log context usage
        const contextTokens = this.getTotalTokens(optimizedHistory);
        console.log(`Context usage: ~${contextTokens} tokens of ${config.ollamaMaxContext} max`);

        // Enhance system prompt to encourage brief responses
        const enhancedSystemPrompt = `${this.scenario.systemPrompt}

IMPORTANT: Keep your responses brief and conversational - typically 1-3 sentences unless more detail is specifically needed. Avoid long explanations or speeches. Respond naturally as a real person would in this situation.`;

        // Generate response with scenario context
        const response = await ollamaService.generateResponse(
          enhancedSystemPrompt,
          conversationHistory,
          userInput
        );

        // Add AI response to messages
        this.messages.push({
          role: 'assistant',
          content: response,
          timestamp: new Date()
        });

        return response;

      } else {
        // Fallback to mock responses
        console.log('Using mock responses (Ollama not configured)');
        return this.getMockResponse(userInput);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Fallback to mock responses on error
      return this.getMockResponse(userInput);
    }
  }

  private getMockResponse(userInput: string): string {
    if (!this.scenario) {
      return "I'm not sure what scenario we're practicing.";
    }

    // Handle audio placeholder messages gracefully
    const isAudioPlaceholder = userInput.includes('[Audio message');
    
    // Mock responses based on scenario
    const responses = {
      'coffee-shop': [
        "What size would you like for your coffee?",
        "Would you like any milk or sugar with that?",
        "That'll be $4.50. Will you be paying with cash or card?",
        "Your coffee will be ready in just a moment!",
        "Is there anything else I can get for you today?"
      ],
      'hotel-checkin': [
        "Welcome! Do you have a reservation with us?",
        "May I have your name please?",
        "I see your reservation here. How many nights will you be staying?",
        "Would you prefer a room with a city view or garden view?",
        "Here's your room key. You're in room 425 on the fourth floor."
      ],
      'restaurant': [
        "Good evening! Table for how many?",
        "Would you like to see our specials for today?",
        "Can I start you off with something to drink?",
        "Are you ready to order, or do you need a few more minutes?",
        "How would you like your steak cooked?"
      ]
    };

    // Extract scenario key from name (simplified)
    const scenarioKey = this.scenario.name.toLowerCase().replace(/\s+/g, '-');
    const scenarioResponses = responses[scenarioKey as keyof typeof responses] || [
      "That's interesting! Tell me more.",
      "I understand. How can I help you with that?",
      "Could you clarify what you mean?",
      "I see. What would you like to do next?",
      "Thank you for sharing that with me."
    ];

    // Pick a response based on conversation length
    const messageCount = this.messages.filter(m => m.role === 'user').length;
    const responseIndex = Math.min(messageCount - 1, scenarioResponses.length - 1);
    let response = scenarioResponses[Math.floor(responseIndex)];
    
    // If this is an audio placeholder, add a friendly acknowledgment
    if (isAudioPlaceholder && messageCount === 1) {
      response = "I heard you! " + response;
    }

    // Add AI response to messages
    this.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    return response;
  }

  getTranscript(): ConversationMessage[] {
    return [...this.messages];
  }

  // Get conversation statistics
  getStats() {
    const userMessages = this.messages.filter(m => m.role === 'user');
    const aiMessages = this.messages.filter(m => m.role === 'assistant');
    
    return {
      totalMessages: this.messages.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      totalTokensEstimate: this.getTotalTokens(this.messages),
      hasSummary: this.conversationSummary !== null,
      summary: this.conversationSummary
    };
  }

  clear(): void {
    this.messages = [];
    this.scenario = null;
    this.conversationSummary = null;
  }

  // Rough token estimation (4 chars ≈ 1 token)
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Get total estimated tokens for conversation
  private getTotalTokens(messages: ConversationMessage[]): number {
    return messages.reduce((total, msg) => {
      return total + this.estimateTokens(msg.content);
    }, 0);
  }

  // Create a summary of older messages
  private async summarizeConversation(messages: ConversationMessage[]): Promise<string> {
    if (!this.useOllama || !config.ollamaUrl) {
      // Simple fallback summary
      const exchanges = Math.floor(messages.length / 2);
      return `Previous conversation included ${exchanges} exchanges about ${this.scenario?.name || 'the topic'}.`;
    }

    try {
      // Use Ollama to create a summary
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const summaryPrompt = `Summarize this conversation in 2-3 sentences, focusing on key points and the current topic:

${conversationText}

Summary:`;

      const response = await ollamaService.generateResponse(
        'You are a helpful assistant that creates concise summaries.',
        [],
        summaryPrompt
      );

      return response;
    } catch (error) {
      console.error('Failed to summarize conversation:', error);
      // Fallback
      const exchanges = Math.floor(messages.length / 2);
      return `Previous conversation included ${exchanges} exchanges about ${this.scenario?.name || 'the topic'}.`;
    }
  }

  // Get conversation history optimized for context window
  private async getOptimizedHistory(): Promise<ConversationMessage[]> {
    const maxContextTokens = config.ollamaMaxContext;
    const reserveTokens = Math.floor(maxContextTokens * 0.1); // Reserve 10% for system prompt and response
    const targetTokens = maxContextTokens - reserveTokens;

    // Start with recent messages
    const recentMessages = this.messages.slice(1); // Skip initial message
    let currentTokens = this.getTotalTokens(recentMessages);

    // If under limit, return all messages
    if (currentTokens < targetTokens) {
      return recentMessages;
    }

    // Need to compress - keep last 4 messages and summarize the rest
    const keepRecent = 4;
    const recentToKeep = recentMessages.slice(-keepRecent);
    const olderMessages = recentMessages.slice(0, -keepRecent);

    // Create summary of older messages
    if (olderMessages.length > 0) {
      this.conversationSummary = await this.summarizeConversation(olderMessages);
    }

    // Return summary + recent messages
    const optimizedHistory: ConversationMessage[] = [];
    
    if (this.conversationSummary) {
      optimizedHistory.push({
        role: 'assistant',
        content: `[Previous conversation summary: ${this.conversationSummary}]`,
        timestamp: new Date()
      });
    }

    optimizedHistory.push(...recentToKeep);
    
    return optimizedHistory;
  }
}

export const conversationService = new ConversationService();