'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRight, Users, Award, BookOpen, type LucideIcon } from 'lucide-react';
import type { CourseData } from '@/lib/mock-data/course';

interface HeroSectionProps {
  course: CourseData;
}

export function HeroSection({ course }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-20 lg:py-32">
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
              <Button size="lg" asChild>
                <Link href={`/enroll?courseid=${course.id}`}>
                  Enroll Now <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline">
                Watch Video
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <StatItem
                icon={Users}
                value={course.stats.students}
                label="Students"
              />
              <StatItem
                icon={Award}
                value={course.stats.rating}
                label="Rating"
              />
              <StatItem
                icon={BookOpen}
                value={course.stats.certificates}
                label="Certificates"
              />
            </div>
          </motion.div>

          {/* Right Column - Image */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square lg:aspect-auto">
              {/* Placeholder for hero image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl" />
              {/* In real implementation, use Next.js Image */}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StatItem({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="text-center lg:text-left">
      <Icon className="w-6 h-6 text-primary mb-2 mx-auto lg:mx-0" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
