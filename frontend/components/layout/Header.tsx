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
    className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#07110f]/90 text-white backdrop-blur-md"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-xl font-bold tracking-tight text-white">
            <span className="hidden sm:inline">LearnWithRico</span>
            <span className="sm:hidden">LWR</span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <a href="#curriculum" className="hidden text-sm font-semibold text-slate-300 hover:text-white md:block">Curriculum</a>
          <a href="#support" className="hidden text-sm font-semibold text-slate-300 hover:text-white md:block">Office hours</a>
          <Button variant="ghost" asChild className="text-slate-200 hover:bg-white/10 hover:text-white">
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button onClick={handleEnrollClick} className="bg-emerald-300 font-bold text-[#07110f] hover:bg-emerald-200">
            Join cohort
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}
