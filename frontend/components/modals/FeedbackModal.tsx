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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star } from 'lucide-react';
import { submitFeedback, type FeedbackCategory } from '@/app/actions/feedback';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  general: 'General Feedback',
};

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      setError('Please enter your feedback');
      return;
    }

    if (category === 'general' && rating === 0) {
      setError('Please provide a rating');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const result = await submitFeedback({
      feedback: feedback.trim(),
      category,
      rating: category === 'general' ? rating : undefined,
    });

    setIsSubmitting(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    // Show success state briefly, then close
    setSubmitSuccess(true);
    setTimeout(() => {
      resetForm();
      onOpenChange(false);
    }, 1500);
  };

  const resetForm = () => {
    setFeedback('');
    setCategory('general');
    setRating(0);
    setHoveredRating(0);
    setError('');
    setSubmitSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleCategoryChange = (value: FeedbackCategory) => {
    setCategory(value);
    if (value !== 'general') {
      setRating(0);
    }
    setError('');
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
        {submitSuccess ? (
          <div className="py-8 text-center">
            <div className="text-4xl mb-2">&#10003;</div>
            <p className="text-lg font-medium text-green-600">Thank you for your feedback!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {category === 'general' && (
                <div className="grid gap-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="p-1 hover:scale-110 transition-transform"
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        onClick={() => {
                          setRating(star);
                          setError('');
                        }}
                        aria-label={`Rate ${star} out of 5 stars`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= (hoveredRating || rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
