export type FeedbackCategory = 'bug' | 'feature' | 'general';

export interface Feedback {
  feedbackId: string;
  userId: string;
  feedback: string;
  category: FeedbackCategory;
  rating?: number; // 1-5, only for 'general' category
  createdAt: string;
}

export interface CreateFeedbackRequest {
  feedback: string;
  category: FeedbackCategory;
  rating?: number;
}
