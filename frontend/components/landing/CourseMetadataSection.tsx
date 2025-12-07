'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'motion/react';
import { Check, Clock, BarChart, GraduationCap } from 'lucide-react';
import type { CourseData } from '@/types/landing';

interface CourseMetadataSectionProps {
  course: CourseData;
}

export function CourseMetadataSection({ course }: CourseMetadataSectionProps) {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-primary/10 to-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-gradient-to-tr from-cyan-400/10 to-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Instructor & Course Details */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <GraduationCap className="w-6 h-6 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Meet Your Instructor
              </h2>
            </div>

            <Card className="p-6 mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                  <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-indigo-600 text-white">
                    {course.instructor.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1 text-gray-900">
                    {course.instructor.name}
                  </h3>
                  <p className="text-sm font-medium text-primary mb-3">
                    {course.instructor.title}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {course.instructor.background}
                  </p>
                </div>
              </div>
            </Card>

            {/* Course Details */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <h3 className="text-lg font-bold mb-5 text-gray-900">Course Details</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-indigo-500/5">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Duration: {course.duration}</span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                    <BarChart className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Level: {course.level}</span>
                </div>
                <div className="pt-2">
                  <Badge className="bg-gradient-to-r from-primary to-indigo-600 text-white border-0 px-4 py-1.5 shadow-md">
                    {course.category}
                  </Badge>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              What You&apos;ll Learn
            </h2>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <ul className="space-y-4">
                {course.outcomes.map((outcome, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-start gap-4 p-3 rounded-xl hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-colors duration-200"
                  >
                    <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0 stroke-[3]" />
                    <span className="text-gray-700 leading-relaxed">{outcome}</span>
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
