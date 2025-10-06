'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Are You Ready To Start Our Course Now?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of students who are already learning and growing their skills.
            Start your journey today with lifetime access to all course materials.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/enroll?courseid=course-001">
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              Contact Us
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
