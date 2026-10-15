import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    quote: "Our platform is designed to transform how construction projects are managed. The integrated bidding system is built to save countless hours.",
    author: "For Project Directors",
    position: "Streamlined Oversight",
    company: "Efficiency Redefined",
    avatar: "PD",
    rating: 5,
    color: 'blue'
  },
  {
    quote: "We're focusing on real-time collaboration features aimed at improving team efficiency and making legacy systems a thing of the past.",
    author: "For Operations Managers",
    position: "Optimized Workflows",
    company: "Seamless Operations",
    avatar: "OM",
    rating: 5,
    color: 'purple'
  },
  {
    quote: "A platform built from the ground up to understand and handle the complex, data-heavy demands of modern infrastructure projects.",
    author: "For Senior Engineers",
    position: "Advanced Analytics",
    company: "Data-Driven Decisions",
    avatar: "SE",
    rating: 5,
    color: 'green'
  }
];

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-violet-600',
    green: 'from-green-500 to-emerald-600',
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7 }}
      className="py-24 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative overflow-hidden"
      aria-label="Testimonials"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          animate={{ x: [0, -30, 0], y: [0, -50, 0] }}
          transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }}
        />
      </div>

      {/* Quote decoration */}
      <div className="absolute top-20 left-10 opacity-5">
        <Quote className="w-32 h-32 text-blue-900" />
      </div>
      <div className="absolute bottom-20 right-10 opacity-5 rotate-180">
        <Quote className="w-32 h-32 text-blue-900" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-200/50 mb-6"
          >
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-yellow-700">Built For Your Role</span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 font-heading mb-6">
            Designed for infrastructure{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              teams
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover how InfraSoko adapts to the unique needs of every stakeholder.
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + index * 0.15, duration: 0.6 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={cn(
                "group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100",
                activeIndex === index && "ring-2 ring-blue-500/20"
              )}
            >
              {/* Gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClasses[testimonial.color as keyof typeof colorClasses]} rounded-t-3xl`} />
              
              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + index * 0.1 + i * 0.05 }}
                  >
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  </motion.div>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-700 text-lg leading-relaxed mb-8 relative">
                <Quote className="absolute -top-2 -left-2 h-8 w-8 text-gray-200 -z-10" />
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[testimonial.color as keyof typeof colorClasses]} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                >
                  {testimonial.avatar}
                </motion.div>
                <div>
                  <p className="font-semibold text-gray-900 font-heading">{testimonial.author}</p>
                  <p className="text-gray-500 text-sm">{testimonial.position}</p>
                  <p className="text-blue-600 text-sm font-medium">{testimonial.company}</p>
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </motion.div>
          ))}
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2 mt-12">
          {testimonials.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setActiveIndex(index)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                activeIndex === index 
                  ? "bg-blue-600 w-8" 
                  : "bg-gray-300 hover:bg-gray-400"
              )}
            />
          ))}
        </div>

        {/* Core Principles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center items-center gap-8 mt-16 pt-12 border-t border-gray-100"
        >
          {[
            { label: 'Security First', sublabel: 'Architecture' },
            { label: 'Cloud-Native', sublabel: 'Performance' },
            { label: 'Data Privacy', sublabel: 'Built-in' },
            { label: 'High Availability', sublabel: 'Infrastructure' },
          ].map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="text-center px-6 py-3 bg-gray-50 rounded-xl border border-gray-100"
            >
              <p className="font-bold text-gray-900">{badge.label}</p>
              <p className="text-sm text-gray-500">{badge.sublabel}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
