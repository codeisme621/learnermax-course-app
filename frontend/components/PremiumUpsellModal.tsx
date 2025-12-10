'use client';

import { useState } from 'react';
import { signUpForEarlyAccess } from '@/app/actions/students';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';

interface PremiumUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInterestedInPremium: boolean;
}

export function PremiumUpsellModal({
  isOpen,
  onClose,
  isInterestedInPremium,
}: PremiumUpsellModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSignedUp, setHasSignedUp] = useState(isInterestedInPremium);
  const [error, setError] = useState<string | null>(null);

  const handleEarlyAccessSignup = async () => {
    setIsLoading(true);
    setError(null);

    console.log('[PremiumUpsellModal] Early access signup initiated');

    const result = await signUpForEarlyAccess('premium-spec-course');

    if (result.success) {
      console.log('[PremiumUpsellModal] Signup successful', {
        studentId: result.student?.studentId,
      });
      setHasSignedUp(true);
    } else {
      console.error('[PremiumUpsellModal] Signup failed', {
        error: result.error,
        courseId: 'premium-spec-course',
      });
      setError(result.error || 'Failed to sign up. Please try again.');
    }

    setIsLoading(false);
  };

  console.log('[PremiumUpsellModal] Modal opened', { isInterestedInPremium });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-3xl font-bold text-gray-900 mb-2">
              Congratulations! 🎉
            </DialogTitle>
            <DialogDescription className="text-lg text-gray-600">
              You&apos;ve completed the course. Ready to take your skills to the next level?
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Premium course card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start mb-3">
            <span className="bg-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              COMING SOON
            </span>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Advanced Spec-Driven Development Mastery
          </h3>

          <p className="text-gray-700 mb-4">
            Master advanced spec-driven development techniques with real-world case studies,
            hands-on projects, and in-depth coverage of context engineering patterns.
            Build a comprehensive portfolio of specs that showcase your expertise.
          </p>

          {/* Learning objectives */}
          <div className="space-y-2 mb-4">
            <p className="text-sm font-semibold text-gray-900">What you&apos;ll learn:</p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>Design complex multi-feature specifications for large codebases</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>Implement advanced context engineering patterns and best practices</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>Build spec-driven development workflows for development teams</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>Create reusable spec templates and pattern libraries</span>
              </li>
            </ul>
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-semibold">Duration:</span> 6-8 hours of in-depth content
          </div>
        </div>

        {/* CTA section */}
        {hasSignedUp ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center gap-3 text-green-600 text-lg font-semibold mb-2">
              <Check className="w-8 h-8" />
              <span>You&apos;re on the early access list!</span>
            </div>
            <p className="text-gray-600">
              We&apos;ll notify you when the course launches.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleEarlyAccessSignup}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-6 px-6 rounded-lg transition-colors text-lg"
            >
              {isLoading ? 'Signing up...' : 'Join Early Access'}
            </Button>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              onClick={onClose}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 transition-colors"
            >
              Maybe later
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
