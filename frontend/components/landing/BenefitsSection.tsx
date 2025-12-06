'use client';

import { Card } from '@/components/ui/card';
import { motion } from 'motion/react';
import {
  Flame,
  type LucideIcon
} from 'lucide-react';

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string[];
}

const benefits: Benefit[] = [
  {
    icon: Flame,
    title: 'Lifetime Access',
    description: [
      'You get everything forever — every lesson, every update, every template, every improvement.',
      'AI evolves fast. Your workflow will too.',
    ],
  },
  {
    icon: Flame,
    title: 'Master Spec-Driven Development (The Anti-Slop Workflow)',
    description: [
      'AI coding is powerful, but without structure it can do more harm than good.',
      'This course gives you the exact system that eliminates inconsistency, prevents rework, and forces clean, scalable output.',
      'Stop wrestling with AI. Start controlling it.',
    ],
  },
  {
    icon: Flame,
    title: 'Ship 10× Faster',
    description: [
      'Specs turn every build into a predictable, repeatable process.',
      'No more rewriting half the code your AI spit out.',
      'No more "uhh… why did it code it that way?" moments.',
      'Just predictable, clean code.',
    ],
  },
  {
    icon: Flame,
    title: 'Weekly Developer Meetups',
    description: [
      'Learn with devs who are pushing the limits of AI coding.',
      'Break down real specs, review real examples, and level up through actual practice — not theory.',
      'This is where developers go from "trying AI" to actually using AI like a pro.',
    ],
  },
  {
    icon: Flame,
    title: 'Build Skills Your Peers Won\'t Have for Years',
    description: [
      'Most developers vibe-code with AI and hope for the best.',
      'You\'ll learn the workflow that makes you: faster, more consistent, more scalable, and dramatically more valuable.',
      'This isn\'t another coding course. This is the system that puts you ahead of the pack.',
    ],
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
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Join developers who are done with vibe-coding chaos and want a proven system that actually works with AI — not against it.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
        <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-orange-500" />
        </div>
        <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
        <div className="space-y-2">
          {benefit.description.map((paragraph, i) => (
            <p key={i} className="text-muted-foreground text-sm">
              {paragraph}
            </p>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
