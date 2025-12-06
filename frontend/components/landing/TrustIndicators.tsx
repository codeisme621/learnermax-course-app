'use client';

import { motion } from 'motion/react';

export function TrustIndicators() {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-xl md:text-2xl font-semibold mb-4">
            Crafted From Real-World Engineering Battles—Yours Free
          </h2>

          <p className="text-muted-foreground">
            These techniques come from leading large-scale software projects, fixing broken AI workflows, and eliminating endless rework. I&apos;ve distilled everything into a clear system you can apply today.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
