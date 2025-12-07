'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, Award, Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { CourseData } from '@/types/landing';

interface HeroSectionProps {
  course: CourseData;
}

export function HeroSection({ course }: HeroSectionProps) {
  const router = useRouter();

  const handleEnrollClick = () => {
    // Store courseId in sessionStorage
    sessionStorage.setItem('pendingEnrollmentCourseId', course.id);
    // Navigate to enroll page
    router.push('/enroll');
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20 lg:py-32">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-400/20 to-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-300/10 to-purple-300/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Badge className="mb-4 bg-gradient-to-r from-primary to-indigo-600 text-white border-0 px-4 py-1.5 text-sm font-medium shadow-lg shadow-primary/25">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {course.category}
              </Badge>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              {course.title}
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
              {course.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Button
                size="lg"
                onClick={handleEnrollClick}
                className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5 text-base px-8"
              >
                Enroll Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 justify-center lg:justify-start">
              <motion.div
                className="text-center lg:text-left bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/50"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center mb-2 mx-auto lg:mx-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{course.stats.students}</div>
                <div className="text-sm text-gray-500">Students</div>
              </motion.div>
              <motion.div
                className="text-center lg:text-left bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/50"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-2 mx-auto lg:mx-0">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{course.stats.rating}</div>
                <div className="text-sm text-gray-500">Rating</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Column - Image */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-md lg:max-w-lg">
              {/* Decorative ring behind image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-500/30 rounded-3xl blur-2xl scale-105" />
              <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/50">
                <Image
                  src="/images/hero.png"
                  alt="Spec-Driven Development with AI"
                  width={512}
                  height={512}
                  className="w-full h-auto rounded-2xl"
                  priority
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
