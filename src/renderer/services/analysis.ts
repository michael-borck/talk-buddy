import { ConversationMessage, Session } from '../types';

export interface ConversationAnalysis {
  overall: {
    totalDuration: number;
    messageCount: number;
    wordsSpoken: number;
    averageWordsPerMessage: number;
    conversationPace: 'slow' | 'moderate' | 'fast';
    responseTimeAvg: number;
  };
  speaking: {
    totalSpeakingTime: number;
    averageResponseLength: number;
    longestResponse: number;
    shortestResponse: number;
    fillerWordCount: number;
    fillerWordPercentage: number;
    commonFillers: Array<{ word: string; count: number }>;
  };
  fluency: {
    score: number; // 0-100
    factors: {
      responseTime: number;
      messageLength: number;
      fillerWords: number;
      conversationFlow: number;
    };
    feedback: string[];
  };
  engagement: {
    score: number; // 0-100
    userInitiated: number;
    questionsAsked: number;
    followUpResponses: number;
    conversationDepth: 'shallow' | 'moderate' | 'deep';
  };
  improvements: {
    strengths: string[];
    areasForImprovement: string[];
    specificSuggestions: string[];
  };
}

const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'so', 'well', 'actually', 'basically', 
  'literally', 'honestly', 'obviously', 'right', 'okay', 'yeah', 'hmm',
  'er', 'ah', 'kind of', 'sort of', 'i mean', 'you see'
];

const QUESTION_INDICATORS = [
  '?', 'what', 'when', 'where', 'who', 'why', 'how', 'which', 'would', 
  'could', 'should', 'can', 'do you', 'did you', 'will you', 'are you',
  'is it', 'have you'
];

export function analyzeConversation(session: Session, messages: ConversationMessage[]): ConversationAnalysis {
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  if (userMessages.length === 0) {
    return createEmptyAnalysis();
  }

  // Calculate response times
  const responseTimes = calculateResponseTimes(messages);
  const responseTimeAvg = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;

  // Analyze user speech content
  const allUserText = userMessages.map(m => m.content).join(' ');
  const words = allUserText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;

  // Filler word analysis
  const fillerAnalysis = analyzeFillerWords(words);

  // Calculate speaking metrics
  const messageLengths = userMessages.map(m => m.content.split(/\s+/).length);
  const averageResponseLength = messageLengths.reduce((a, b) => a + b, 0) / messageLengths.length;
  const longestResponse = Math.max(...messageLengths);
  const shortestResponse = Math.min(...messageLengths);

  // Engagement analysis
  const engagementMetrics = analyzeEngagement(userMessages, assistantMessages);

  // Fluency scoring
  const fluencyScore = calculateFluencyScore({
    responseTimeAvg,
    averageResponseLength,
    fillerWordPercentage: fillerAnalysis.percentage,
    messageCount: userMessages.length,
    totalDuration: session.duration || 0
  });

  // Generate improvements and feedback
  const improvements = generateImprovements({
    responseTimeAvg,
    fillerWordPercentage: fillerAnalysis.percentage,
    averageResponseLength,
    engagementScore: engagementMetrics.score,
    fluencyScore: fluencyScore.score,
    conversationLength: userMessages.length
  });

  return {
    overall: {
      totalDuration: session.duration || 0,
      messageCount: userMessages.length,
      wordsSpoken: totalWords,
      averageWordsPerMessage: averageResponseLength,
      conversationPace: categorizeConversationPace(responseTimeAvg),
      responseTimeAvg
    },
    speaking: {
      totalSpeakingTime: estimateSpeakingTime(totalWords),
      averageResponseLength,
      longestResponse,
      shortestResponse,
      fillerWordCount: fillerAnalysis.count,
      fillerWordPercentage: fillerAnalysis.percentage,
      commonFillers: fillerAnalysis.common
    },
    fluency: fluencyScore,
    engagement: engagementMetrics,
    improvements
  };
}

function calculateResponseTimes(messages: ConversationMessage[]): number[] {
  const times: number[] = [];
  
  for (let i = 1; i < messages.length; i++) {
    const currentMsg = messages[i];
    const prevMsg = messages[i - 1];
    
    if (currentMsg.role === 'user' && prevMsg.role === 'assistant') {
      const currentTime = new Date(currentMsg.timestamp).getTime();
      const prevTime = new Date(prevMsg.timestamp).getTime();
      const responseTime = (currentTime - prevTime) / 1000; // Convert to seconds
      
      // Only include reasonable response times (1-60 seconds)
      if (responseTime >= 1 && responseTime <= 60) {
        times.push(responseTime);
      }
    }
  }
  
  return times;
}

function analyzeFillerWords(words: string[]): { count: number; percentage: number; common: Array<{ word: string; count: number }> } {
  const fillerCounts = new Map<string, number>();
  let totalFillers = 0;

  words.forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[^\w\s]/g, '');
    if (FILLER_WORDS.includes(cleanWord)) {
      fillerCounts.set(cleanWord, (fillerCounts.get(cleanWord) || 0) + 1);
      totalFillers++;
    }
  });

  // Handle multi-word fillers
  const text = words.join(' ');
  const multiWordFillers = ['you know', 'i mean', 'kind of', 'sort of'];
  multiWordFillers.forEach(phrase => {
    const count = (text.match(new RegExp(phrase, 'gi')) || []).length;
    if (count > 0) {
      fillerCounts.set(phrase, count);
      totalFillers += count;
    }
  });

  const commonFillers = Array.from(fillerCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    count: totalFillers,
    percentage: words.length > 0 ? (totalFillers / words.length) * 100 : 0,
    common: commonFillers
  };
}

function analyzeEngagement(userMessages: ConversationMessage[], _assistantMessages: ConversationMessage[]): {
  score: number;
  userInitiated: number;
  questionsAsked: number;
  followUpResponses: number;
  conversationDepth: 'shallow' | 'moderate' | 'deep';
} {
  let questionsAsked = 0;
  let followUpResponses = 0;

  userMessages.forEach(msg => {
    const content = msg.content.toLowerCase();
    
    // Count questions
    if (content.includes('?') || QUESTION_INDICATORS.some(indicator => content.includes(indicator))) {
      questionsAsked++;
    }

    // Count follow-up responses (messages longer than average that build on conversation)
    if (msg.content.split(/\s+/).length > 10) {
      followUpResponses++;
    }
  });

  const avgMessageLength = userMessages.reduce((acc, msg) => acc + msg.content.split(/\s+/).length, 0) / userMessages.length;
  const conversationDepth: 'shallow' | 'moderate' | 'deep' = 
    avgMessageLength < 5 ? 'shallow' : 
    avgMessageLength < 12 ? 'moderate' : 'deep';

  // Calculate engagement score (0-100)
  let score = 0;
  score += Math.min(questionsAsked * 15, 30); // Up to 30 points for questions
  score += Math.min(followUpResponses * 10, 25); // Up to 25 points for detailed responses
  score += Math.min(userMessages.length * 2, 20); // Up to 20 points for message count
  score += conversationDepth === 'deep' ? 25 : conversationDepth === 'moderate' ? 15 : 5; // Depth bonus

  return {
    score: Math.min(score, 100),
    userInitiated: questionsAsked,
    questionsAsked,
    followUpResponses,
    conversationDepth
  };
}

function calculateFluencyScore(metrics: {
  responseTimeAvg: number;
  averageResponseLength: number;
  fillerWordPercentage: number;
  messageCount: number;
  totalDuration: number;
}): {
  score: number;
  factors: {
    responseTime: number;
    messageLength: number;
    fillerWords: number;
    conversationFlow: number;
  };
  feedback: string[];
} {
  const factors = {
    responseTime: 0,
    messageLength: 0,
    fillerWords: 0,
    conversationFlow: 0
  };

  const feedback: string[] = [];

  // Response time scoring (0-25 points)
  if (metrics.responseTimeAvg <= 3) {
    factors.responseTime = 25;
    feedback.push("Excellent response timing! You respond quickly and naturally.");
  } else if (metrics.responseTimeAvg <= 6) {
    factors.responseTime = 20;
    feedback.push("Good response timing. Try to respond a bit more quickly for better flow.");
  } else if (metrics.responseTimeAvg <= 10) {
    factors.responseTime = 15;
    feedback.push("Response timing could be improved. Practice responding more spontaneously.");
  } else {
    factors.responseTime = 10;
    feedback.push("Work on reducing hesitation time between responses.");
  }

  // Message length scoring (0-25 points)
  if (metrics.averageResponseLength >= 8 && metrics.averageResponseLength <= 15) {
    factors.messageLength = 25;
    feedback.push("Perfect response length! Your answers are detailed but concise.");
  } else if (metrics.averageResponseLength >= 5 && metrics.averageResponseLength <= 20) {
    factors.messageLength = 20;
  } else if (metrics.averageResponseLength < 5) {
    factors.messageLength = 10;
    feedback.push("Try to provide more detailed responses to show engagement.");
  } else {
    factors.messageLength = 15;
    feedback.push("Your responses are very detailed. Consider being more concise.");
  }

  // Filler words scoring (0-25 points)
  if (metrics.fillerWordPercentage <= 2) {
    factors.fillerWords = 25;
    feedback.push("Excellent speech clarity with minimal filler words!");
  } else if (metrics.fillerWordPercentage <= 5) {
    factors.fillerWords = 20;
    feedback.push("Good speech clarity. Try to reduce filler words slightly.");
  } else if (metrics.fillerWordPercentage <= 10) {
    factors.fillerWords = 15;
    feedback.push("Work on reducing filler words like 'um', 'uh', and 'like'.");
  } else {
    factors.fillerWords = 10;
    feedback.push("Focus on speaking more clearly and reducing filler words.");
  }

  // Conversation flow scoring (0-25 points)
  const messagesPerMinute = metrics.totalDuration > 0 ? (metrics.messageCount / (metrics.totalDuration / 60)) : 0;
  if (messagesPerMinute >= 2 && messagesPerMinute <= 4) {
    factors.conversationFlow = 25;
    feedback.push("Great conversation flow! Natural back-and-forth rhythm.");
  } else if (messagesPerMinute >= 1 && messagesPerMinute <= 6) {
    factors.conversationFlow = 20;
  } else {
    factors.conversationFlow = 15;
    feedback.push("Work on maintaining a natural conversation rhythm.");
  }

  const totalScore = factors.responseTime + factors.messageLength + factors.fillerWords + factors.conversationFlow;

  return {
    score: totalScore,
    factors,
    feedback
  };
}

function generateImprovements(metrics: {
  responseTimeAvg: number;
  fillerWordPercentage: number;
  averageResponseLength: number;
  engagementScore: number;
  fluencyScore: number;
  conversationLength: number;
}): {
  strengths: string[];
  areasForImprovement: string[];
  specificSuggestions: string[];
} {
  const strengths: string[] = [];
  const areasForImprovement: string[] = [];
  const specificSuggestions: string[] = [];

  // Identify strengths
  if (metrics.fluencyScore >= 80) {
    strengths.push("Excellent overall fluency and speech clarity");
  }
  if (metrics.engagementScore >= 70) {
    strengths.push("High engagement and active participation");
  }
  if (metrics.responseTimeAvg <= 4) {
    strengths.push("Quick and natural response timing");
  }
  if (metrics.fillerWordPercentage <= 3) {
    strengths.push("Clear speech with minimal hesitation");
  }
  if (metrics.conversationLength >= 8) {
    strengths.push("Sustained conversation participation");
  }

  // Identify areas for improvement
  if (metrics.fluencyScore < 60) {
    areasForImprovement.push("Overall speech fluency");
    specificSuggestions.push("Practice speaking exercises daily to improve fluency");
  }
  if (metrics.responseTimeAvg > 8) {
    areasForImprovement.push("Response timing");
    specificSuggestions.push("Practice thinking in the target language to reduce hesitation");
  }
  if (metrics.fillerWordPercentage > 8) {
    areasForImprovement.push("Speech clarity and confidence");
    specificSuggestions.push("Record yourself speaking and identify your most common filler words");
  }
  if (metrics.engagementScore < 50) {
    areasForImprovement.push("Conversation engagement");
    specificSuggestions.push("Ask more questions and provide detailed responses to show interest");
  }
  if (metrics.averageResponseLength < 5) {
    areasForImprovement.push("Response detail and elaboration");
    specificSuggestions.push("Try to expand on your answers with examples or additional details");
  }

  // General suggestions based on conversation length
  if (metrics.conversationLength < 5) {
    specificSuggestions.push("Try to extend conversations by asking follow-up questions");
  }

  // Ensure we have at least one strength
  if (strengths.length === 0) {
    strengths.push("Completed the conversation practice session");
  }

  return {
    strengths,
    areasForImprovement,
    specificSuggestions
  };
}

function categorizeConversationPace(avgResponseTime: number): 'slow' | 'moderate' | 'fast' {
  if (avgResponseTime <= 3) return 'fast';
  if (avgResponseTime <= 7) return 'moderate';
  return 'slow';
}

function estimateSpeakingTime(wordCount: number): number {
  // Average speaking rate is about 150-160 words per minute
  // We'll use 150 WPM as baseline
  return Math.round((wordCount / 150) * 60); // Return in seconds
}

function createEmptyAnalysis(): ConversationAnalysis {
  return {
    overall: {
      totalDuration: 0,
      messageCount: 0,
      wordsSpoken: 0,
      averageWordsPerMessage: 0,
      conversationPace: 'moderate',
      responseTimeAvg: 0
    },
    speaking: {
      totalSpeakingTime: 0,
      averageResponseLength: 0,
      longestResponse: 0,
      shortestResponse: 0,
      fillerWordCount: 0,
      fillerWordPercentage: 0,
      commonFillers: []
    },
    fluency: {
      score: 0,
      factors: {
        responseTime: 0,
        messageLength: 0,
        fillerWords: 0,
        conversationFlow: 0
      },
      feedback: []
    },
    engagement: {
      score: 0,
      userInitiated: 0,
      questionsAsked: 0,
      followUpResponses: 0,
      conversationDepth: 'shallow'
    },
    improvements: {
      strengths: [],
      areasForImprovement: [],
      specificSuggestions: []
    }
  };
}