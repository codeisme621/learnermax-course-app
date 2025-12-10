'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import { track } from '@vercel/analytics';

export function CtaSection() {
  const router = useRouter();

  const handleGetStartedClick = () => {
    // Track CTA click for analytics
    track('cta_clicked', { location: 'cta_section' });
    // Store hardcoded courseId as per spec
    sessionStorage.setItem('pendingEnrollmentCourseId', 'spec-driven-dev-mini');
    router.push('/enroll');
  };

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-primary via-indigo-600 to-purple-700 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:24px_24px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white">
            Take Control of Your AI Coding Workflow
          </h2>
          <p className="text-lg text-white/80 mb-10 leading-relaxed">
            Move beyond guesswork and learn a proven system that turns AI into a reliable engineering tool.
          </p>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleGetStartedClick}
              className="bg-white text-primary hover:bg-white/90 shadow-2xl shadow-black/20 hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 text-base px-8 py-6 font-semibold"
            >
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <p className="mt-6 text-sm text-white/60">
            Join 100+ developers already mastering AI-powered development
          </p>
        </motion.div>
      </div>
    </section>
  );
}
