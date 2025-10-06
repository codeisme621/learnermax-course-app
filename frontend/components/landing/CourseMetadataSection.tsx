'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, BarChart } from 'lucide-react';
import type { CourseData } from '@/lib/mock-data/course';

interface CourseMetadataSectionProps {
  course: CourseData;
}

export function CourseMetadataSection({ course }: CourseMetadataSectionProps) {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Instructor & Course Details */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Meet Your Instructor
            </h2>

            <Card className="p-6 mb-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg">
                    {course.instructor.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">
                    {course.instructor.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {course.instructor.title}
                  </p>
                  <p className="text-sm">
                    {course.instructor.background}
                  </p>
                </div>
              </div>
            </Card>

            {/* Course Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Course Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-sm">Duration: {course.duration}</span>
                </div>
                <div className="flex items-center gap-3">
                  <BarChart className="w-5 h-5 text-primary" />
                  <span className="text-sm">Level: {course.level}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{course.category}</Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Learning Outcomes */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              What You&apos;ll Learn
            </h2>

            <Card className="p-6">
              <ul className="space-y-4">
                {course.outcomes.map((outcome, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{outcome}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
