'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, Award } from 'lucide-react';
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
//bg-gradient-to-b from-muted/50 to-background
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#f3f4f6] to-white  py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <Badge variant="secondary" className="mb-4">
              {course.category}
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {course.title}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              {course.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Button size="lg" onClick={handleEnrollClick}>
                Enroll Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 justify-center lg:justify-start">
              <div className="text-center lg:text-left">
                <Users className="w-6 h-6 text-primary mb-2 mx-auto lg:mx-0" />
                <div className="text-2xl font-bold">{course.stats.students}</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
              <div className="text-center lg:text-left">
                <Award className="w-6 h-6 text-primary mb-2 mx-auto lg:mx-0" />
                <div className="text-2xl font-bold">{course.stats.rating}</div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Image */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-md lg:max-w-lg bg-white/90 shadow-xl p-6">
              <Image
                src="/images/hero.png"
                alt="Spec-Driven Development with AI"
                width={512}
                height={512}
                className="w-full h-auto rounded-2xl"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
