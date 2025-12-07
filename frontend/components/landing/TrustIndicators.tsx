'use client';

import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

export function TrustIndicators() {
  return (
    <section className="py-16 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-12 h-12 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-lg shadow-primary/30"
          >
            <Zap className="w-6 h-6 text-white" />
          </motion.div>

          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 text-white">
            Crafted From Real-World Engineering Battles—Yours Free
          </h2>

          <p className="text-gray-300 text-lg leading-relaxed">
            These techniques come from leading large-scale software projects, fixing broken AI workflows, and eliminating endless rework. I&apos;ve distilled everything into a clear system you can apply today.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
