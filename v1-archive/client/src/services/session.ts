import { pb } from './pocketbase';
import type { ConversationMetrics } from './metrics';

export interface SessionMetrics {
  totalUserMessages: number;
  totalAIMessages: number;
  averageResponseTime?: number;
  longestPause?: number;
  totalPauses?: number;
  totalTokensEstimate?: number;
  contextCompressed?: boolean;
  conversationSummary?: string;
  conversationMetrics?: ConversationMetrics;
}

export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned' | 'timeout';

export interface Session {
  id?: string;
  user?: string;
  scenario: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: SessionStatus;
  currentTurn?: number;
  pausedAt?: string;
  transcript: any[];
  metadata?: SessionMetrics;
}

class SessionService {
  private currentSession: Session | null = null;
  private sessionStartTime: Date | null = null;
  private metrics: SessionMetrics = {
    totalUserMessages: 0,
    totalAIMessages: 0,
  };

  async createSession(scenarioId: string): Promise<Session> {
    this.sessionStartTime = new Date();
    this.metrics = {
      totalUserMessages: 0,
      totalAIMessages: 0,
    };

    const session: Session = {
      scenario: scenarioId,
      startTime: this.sessionStartTime.toISOString(),
      status: 'active',
      currentTurn: 0,
      transcript: [],
      metadata: this.metrics,
    };

    // Add user ID if authenticated
    const userId = pb.authStore.model?.id;
    if (userId) {
      (session as any).user = userId;
    }

    try {
      const record = await pb.collection('sessions').create(session);
      this.currentSession = { ...session, id: record.id };
      console.log('Session created:', this.currentSession);
      return this.currentSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      // Still track locally even if save fails
      this.currentSession = session;
      return session;
    }
  }

  async updateTranscript(transcript: any[], additionalMetrics?: Partial<SessionMetrics>): Promise<void> {
    if (!this.currentSession) return;

    // Update metrics
    this.metrics.totalUserMessages = transcript.filter(m => m.role === 'user').length;
    this.metrics.totalAIMessages = transcript.filter(m => m.role === 'assistant').length;
    
    // Merge additional metrics
    if (additionalMetrics) {
      this.metrics = { ...this.metrics, ...additionalMetrics };
    }

    this.currentSession.transcript = transcript;
    this.currentSession.metadata = this.metrics;

    if (this.currentSession.id) {
      try {
        await pb.collection('sessions').update(this.currentSession.id, {
          transcript,
          metadata: this.metrics,
        });
        console.log('Session transcript updated with metrics:', this.metrics);
      } catch (error) {
        console.error('Failed to update session transcript:', error);
      }
    }
  }

  async endSession(conversationMetrics?: ConversationMetrics): Promise<Session | null> {
    if (!this.currentSession || !this.sessionStartTime) return null;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - this.sessionStartTime.getTime()) / 1000);

    this.currentSession.endTime = endTime.toISOString();
    this.currentSession.duration = duration;

    // Add conversation metrics to session metadata
    if (conversationMetrics) {
      this.metrics.averageResponseTime = conversationMetrics.averageResponseTime;
      this.metrics.totalPauses = conversationMetrics.totalPauses;
      
      // Store full conversation metrics in metadata
      this.currentSession.metadata = {
        ...this.metrics,
        conversationMetrics
      };
    }

    if (this.currentSession.id) {
      try {
        await pb.collection('sessions').update(this.currentSession.id, {
          endTime: this.currentSession.endTime,
          duration,
          metadata: this.currentSession.metadata,
        });
        console.log('Session ended with metrics:', this.currentSession);
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }

    const completedSession = this.currentSession;
    this.currentSession = null;
    this.sessionStartTime = null;
    
    return completedSession;
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  async pauseSession(): Promise<Session | null> {
    if (!this.currentSession) return null;

    this.currentSession.status = 'paused';
    this.currentSession.pausedAt = new Date().toISOString();

    if (this.currentSession.id) {
      try {
        await pb.collection('sessions').update(this.currentSession.id, {
          status: 'paused',
          pausedAt: this.currentSession.pausedAt,
          currentTurn: this.currentSession.currentTurn,
          transcript: this.currentSession.transcript,
          metadata: this.metrics,
        });
        console.log('Session paused:', this.currentSession);
      } catch (error) {
        console.error('Failed to pause session:', error);
      }
    }

    return this.currentSession;
  }

  async completeSession(conversationMetrics?: ConversationMetrics): Promise<Session | null> {
    if (!this.currentSession || !this.sessionStartTime) return null;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - this.sessionStartTime.getTime()) / 1000);

    this.currentSession.endTime = endTime.toISOString();
    this.currentSession.duration = duration;
    this.currentSession.status = 'completed';

    // Add conversation metrics to session metadata
    if (conversationMetrics) {
      this.metrics.averageResponseTime = conversationMetrics.averageResponseTime;
      this.metrics.totalPauses = conversationMetrics.totalPauses;
      
      // Store full conversation metrics in metadata
      this.currentSession.metadata = {
        ...this.metrics,
        conversationMetrics
      };
    }

    if (this.currentSession.id) {
      try {
        await pb.collection('sessions').update(this.currentSession.id, {
          endTime: this.currentSession.endTime,
          duration,
          status: 'completed',
          metadata: this.currentSession.metadata,
        });
        console.log('Session completed:', this.currentSession);
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    }

    const completedSession = this.currentSession;
    this.currentSession = null;
    this.sessionStartTime = null;
    
    return completedSession;
  }

  async abandonSession(): Promise<Session | null> {
    if (!this.currentSession) return null;

    this.currentSession.status = 'abandoned';
    this.currentSession.endTime = new Date().toISOString();

    if (this.currentSession.id) {
      try {
        await pb.collection('sessions').update(this.currentSession.id, {
          status: 'abandoned',
          endTime: this.currentSession.endTime,
          metadata: this.metrics,
        });
        console.log('Session abandoned:', this.currentSession);
      } catch (error) {
        console.error('Failed to abandon session:', error);
      }
    }

    const abandonedSession = this.currentSession;
    this.currentSession = null;
    this.sessionStartTime = null;
    
    return abandonedSession;
  }

  updateMetrics(metrics: Partial<SessionMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
    if (this.currentSession) {
      this.currentSession.metadata = this.metrics;
    }
  }
}

export const sessionService = new SessionService();