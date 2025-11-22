'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

export function FeedbackModal({ open, onOpenChange, userId }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      setError('Please enter your feedback');
      return;
    }

    // Log feedback to console (MVP - no backend integration)
    console.log('Feedback submitted:', {
      userId,
      feedback: feedback.trim(),
      timestamp: new Date().toISOString(),
    });

    // Reset form and close modal
    setFeedback('');
    setError('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setFeedback('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            We&apos;d love to hear your thoughts! Share your feedback, suggestions, or report issues.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="feedback">Your Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Tell us what's on your mind..."
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                  setError('');
                }}
                className="min-h-[120px]"
                aria-describedby={error ? 'feedback-error' : undefined}
              />
              {error && (
                <p id="feedback-error" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Submit Feedback</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
