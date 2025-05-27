export interface UserMetrics {
  responseTime: number; // Time from AI speaking to user starting (ms)
  speakingDuration: number; // Total time user was speaking (ms)
  pauseCount: number; // Number of significant pauses
  longestPause: number; // Longest pause duration (ms)
  averagePause: number; // Average pause duration (ms)
  estimatedWordCount?: number; // Rough word count estimate
  wordsPerMinute?: number; // Speaking rate estimate
}

export interface ConversationMetrics {
  turns: TurnMetrics[];
  averageResponseTime: number;
  averageSpeakingDuration: number;
  totalSpeakingTime: number;
  totalPauses: number;
  improvementTrend?: 'improving' | 'steady' | 'needs-practice';
}

export interface TurnMetrics {
  turnNumber: number;
  userMetrics: UserMetrics;
  timestamp: Date;
}

class MetricsService {
  private currentTurnMetrics: Partial<UserMetrics> = {};
  private turnHistory: TurnMetrics[] = [];
  private aiSpeakingEndTime: number | null = null;
  private userSpeakingStartTime: number | null = null;
  private recordingStartTime: number | null = null;
  private pauseThreshold = 500; // Consider pause if silence > 500ms
  private lastSoundTime: number | null = null;
  private pauses: number[] = [];

  // Called when AI finishes speaking
  onAISpeakingEnd(): void {
    this.aiSpeakingEndTime = Date.now();
    console.log('AI finished speaking, waiting for user response...');
  }

  // Called when user starts recording
  onUserStartSpeaking(): void {
    const now = Date.now();
    
    // Calculate response time if AI just spoke
    if (this.aiSpeakingEndTime) {
      this.currentTurnMetrics.responseTime = now - this.aiSpeakingEndTime;
      console.log(`User response time: ${this.currentTurnMetrics.responseTime}ms`);
    }

    this.userSpeakingStartTime = now;
    this.recordingStartTime = now;
    this.lastSoundTime = now;
    this.pauses = [];
  }

  // Called periodically during recording to track pauses
  onAudioActivity(hasSound: boolean): void {
    if (!this.recordingStartTime) return;

    const now = Date.now();
    
    if (hasSound) {
      // Check if this ends a pause
      if (this.lastSoundTime && (now - this.lastSoundTime) > this.pauseThreshold) {
        const pauseDuration = now - this.lastSoundTime;
        this.pauses.push(pauseDuration);
        console.log(`Pause detected: ${pauseDuration}ms`);
      }
      this.lastSoundTime = now;
    }
  }

  // Called when user stops recording
  onUserStopSpeaking(transcript?: string): void {
    if (!this.userSpeakingStartTime) return;

    const now = Date.now();
    this.currentTurnMetrics.speakingDuration = now - this.userSpeakingStartTime;

    // Process pauses
    if (this.pauses.length > 0) {
      this.currentTurnMetrics.pauseCount = this.pauses.length;
      this.currentTurnMetrics.longestPause = Math.max(...this.pauses);
      this.currentTurnMetrics.averagePause = 
        this.pauses.reduce((sum, p) => sum + p, 0) / this.pauses.length;
    } else {
      this.currentTurnMetrics.pauseCount = 0;
      this.currentTurnMetrics.longestPause = 0;
      this.currentTurnMetrics.averagePause = 0;
    }

    // Estimate word count and WPM if we have transcript
    if (transcript) {
      // Simple word count estimate
      this.currentTurnMetrics.estimatedWordCount = transcript.split(/\s+/).length;
      
      // Calculate WPM
      const minutes = (this.currentTurnMetrics.speakingDuration || 0) / 60000;
      if (minutes > 0) {
        this.currentTurnMetrics.wordsPerMinute = 
          Math.round(this.currentTurnMetrics.estimatedWordCount / minutes);
      }
    }

    // Add to turn history
    const turnMetrics: TurnMetrics = {
      turnNumber: this.turnHistory.length + 1,
      userMetrics: this.currentTurnMetrics as UserMetrics,
      timestamp: new Date()
    };
    
    this.turnHistory.push(turnMetrics);
    console.log('Turn metrics recorded:', turnMetrics);

    // Reset for next turn
    this.currentTurnMetrics = {};
    this.aiSpeakingEndTime = null;
    this.userSpeakingStartTime = null;
    this.recordingStartTime = null;
    this.pauses = [];
  }

  // Get metrics for the current conversation
  getConversationMetrics(): ConversationMetrics {
    if (this.turnHistory.length === 0) {
      return {
        turns: [],
        averageResponseTime: 0,
        averageSpeakingDuration: 0,
        totalSpeakingTime: 0,
        totalPauses: 0
      };
    }

    const responseTimes = this.turnHistory
      .map(t => t.userMetrics.responseTime)
      .filter(rt => rt > 0);
    
    const speakingDurations = this.turnHistory
      .map(t => t.userMetrics.speakingDuration);

    const totalPauses = this.turnHistory
      .reduce((sum, t) => sum + t.userMetrics.pauseCount, 0);

    const metrics: ConversationMetrics = {
      turns: this.turnHistory,
      averageResponseTime: responseTimes.length > 0
        ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
        : 0,
      averageSpeakingDuration: speakingDurations.length > 0
        ? speakingDurations.reduce((sum, sd) => sum + sd, 0) / speakingDurations.length
        : 0,
      totalSpeakingTime: speakingDurations.reduce((sum, sd) => sum + sd, 0),
      totalPauses
    };

    // Analyze improvement trend (simple version)
    if (this.turnHistory.length >= 3) {
      const recentTurns = this.turnHistory.slice(-3);
      const recentResponseTimes = recentTurns
        .map(t => t.userMetrics.responseTime)
        .filter(rt => rt > 0);
      
      if (recentResponseTimes.length >= 2) {
        const improving = recentResponseTimes[0] > recentResponseTimes[recentResponseTimes.length - 1];
        const worsening = recentResponseTimes[0] < recentResponseTimes[recentResponseTimes.length - 1];
        
        metrics.improvementTrend = improving ? 'improving' : 
                                  worsening ? 'needs-practice' : 
                                  'steady';
      }
    }

    return metrics;
  }

  // Reset metrics for new conversation
  reset(): void {
    this.currentTurnMetrics = {};
    this.turnHistory = [];
    this.aiSpeakingEndTime = null;
    this.userSpeakingStartTime = null;
    this.recordingStartTime = null;
    this.pauses = [];
  }

  // Get current turn history
  getTurnHistory(): TurnMetrics[] {
    return [...this.turnHistory];
  }
}

export const metricsService = new MetricsService();