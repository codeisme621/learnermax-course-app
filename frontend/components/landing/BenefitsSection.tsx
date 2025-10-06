'use client';

import { Card } from '@/components/ui/card';
import { motion } from 'motion/react';
import {
  Clock,
  Award,
  GraduationCap,
  TrendingUp,
  type LucideIcon
} from 'lucide-react';

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    icon: Clock,
    title: 'Lifetime Access',
    description: 'Once you enroll, you have lifetime access to all course materials and future updates.',
  },
  {
    icon: Award,
    title: 'Get Certificates',
    description: 'Earn a certificate upon completion to showcase your skills and boost your career.',
  },
  {
    icon: GraduationCap,
    title: 'Course Accessibility',
    description: 'Learn at your own pace with 24/7 access to lectures, projects, and resources.',
  },
  {
    icon: TrendingUp,
    title: 'Track Progress',
    description: 'Track your progress and see measurable improvements in your skills over time.',
  },
];

export function BenefitsSection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Why Choose Us?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of students who have transformed their careers through our comprehensive courses.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <BenefitCard key={index} benefit={benefit} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ benefit, index }: { benefit: Benefit; index: number }) {
  const Icon = benefit.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="p-6 h-full hover:shadow-lg transition-shadow">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
        <p className="text-muted-foreground">{benefit.description}</p>
      </Card>
    </motion.div>
  );
}
