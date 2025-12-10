'use client';

import { Card } from '@/components/ui/card';
import { motion } from 'motion/react';
import {
  Infinity,
  Target,
  Rocket,
  Users,
  TrendingUp,
  type LucideIcon
} from 'lucide-react';

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string[];
  gradient: string;
  iconColor: string;
  shadowColor: string;
}

const benefits: Benefit[] = [
  {
    icon: Infinity,
    title: 'Lifetime Access',
    description: [
      'You get everything forever — every lesson, every update, every template, every improvement.',
      'AI evolves fast. Your workflow will too.',
    ],
    gradient: 'from-violet-500 to-purple-600',
    iconColor: 'text-violet-500',
    shadowColor: 'shadow-violet-500/20',
  },
  {
    icon: Target,
    title: 'Master Spec-Driven Development (The Anti-Slop Workflow)',
    description: [
      'AI coding is powerful, but without structure it can do more harm than good.',
      'This course gives you the exact system that eliminates inconsistency, prevents rework, and forces clean, scalable output.',
      'Stop wrestling with AI. Start controlling it.',
    ],
    gradient: 'from-primary to-cyan-500',
    iconColor: 'text-primary',
    shadowColor: 'shadow-primary/20',
  },
  {
    icon: Rocket,
    title: 'Ship 10x Faster',
    description: [
      'Specs turn every build into a predictable, repeatable process.',
      'No more rewriting half the code your AI spit out.',
      'No more "uhh... why did it code it that way?" moments.',
      'Just predictable, clean code.',
    ],
    gradient: 'from-orange-500 to-red-500',
    iconColor: 'text-orange-500',
    shadowColor: 'shadow-orange-500/20',
  },
  {
    icon: Users,
    title: 'Weekly Developer Meetups',
    description: [
      'Learn with devs who are pushing the limits of AI coding.',
      'Break down real specs, review real examples, and level up through actual practice — not theory.',
      'This is where developers go from "trying AI" to actually using AI like a pro.',
    ],
    gradient: 'from-emerald-500 to-teal-500',
    iconColor: 'text-emerald-500',
    shadowColor: 'shadow-emerald-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Build Skills Your Peers Won\'t Have for Years',
    description: [
      'Most developers vibe-code with AI and hope for the best.',
      'You\'ll learn the workflow that makes you: faster, more consistent, more scalable, and dramatically more valuable.',
      'This isn\'t another coding course. This is the system that puts you ahead of the pack.',
    ],
    gradient: 'from-pink-500 to-rose-500',
    iconColor: 'text-pink-500',
    shadowColor: 'shadow-pink-500/20',
  },
];

export function BenefitsSection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-white to-gray-50/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-primary bg-primary/10 rounded-full">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Everything You Need to Master AI Coding
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Join developers who are done with vibe-coding chaos and want a proven system that actually works with AI — not against it.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
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
      whileHover={{ y: -8 }}
      className="h-full"
    >
      <Card className={`p-6 h-full bg-white border-0 shadow-xl ${benefit.shadowColor} hover:shadow-2xl transition-all duration-300 group relative overflow-hidden`}>
        {/* Gradient accent line at top */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${benefit.gradient}`} />

        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-4 text-gray-900">{benefit.title}</h3>
        <div className="space-y-3">
          {benefit.description.map((paragraph, i) => (
            <p key={i} className="text-gray-600 text-base leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
