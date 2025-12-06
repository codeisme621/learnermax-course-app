'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();

  const handleEnrollClick = () => {
    // Store courseId for enrollment
    sessionStorage.setItem('pendingEnrollmentCourseId', 'spec-driven-dev-mini');
    router.push('/enroll');
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold text-primary">
            <span className="hidden sm:inline">LearnWithRico</span>
            <span className="sm:hidden">LWR</span>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/signin">Sign In</Link>
          </Button>
          <Button onClick={handleEnrollClick}>
            Enroll Now
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}
