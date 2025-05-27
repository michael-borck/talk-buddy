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
        
        // Prepare conversation history (exclude initial message from history)
        const conversationHistory = this.messages
          .slice(1) // Skip the initial message
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }));

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

  clear(): void {
    this.messages = [];
    this.scenario = null;
  }
}

export const conversationService = new ConversationService();