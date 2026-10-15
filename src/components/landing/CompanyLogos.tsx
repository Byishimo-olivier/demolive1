import React from 'react';
import { motion } from 'motion/react';
import { Building2, Landmark, Factory, Warehouse, Construction, Truck } from 'lucide-react';

const companies = [
  { name: 'BuildCorp', icon: Building2 },
  { name: 'CityWorks', icon: Landmark },
  { name: 'IndustrialPro', icon: Factory },
  { name: 'LogiStructure', icon: Warehouse },
  { name: 'UrbanDev', icon: Construction },
  { name: 'TransitHub', icon: Truck },
];

export function CompanyLogos() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
      className="py-16 bg-gradient-to-b from-white to-gray-50/50 relative overflow-hidden"
      aria-label="Trusted companies"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
        }} 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            Built for modern construction
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-300" />
            <span className="text-xs text-gray-400">★</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-300" />
          </div>
        </motion.div>

        {/* Animated logo marquee */}
        <div className="relative">
          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          
          <motion.div 
            className="flex gap-8 items-center justify-center flex-wrap md:flex-nowrap"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            {companies.map((company, index) => {
              const Icon = company.icon;
              return (
                <motion.div
                  key={company.name}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.8 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  whileHover={{ 
                    scale: 1.1, 
                    y: -5,
                    transition: { type: 'spring', stiffness: 400 }
                  }}
                  className="group relative"
                >
                  <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center group-hover:from-blue-100 group-hover:to-purple-100 transition-colors duration-300">
                      <Icon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-300" />
                    </div>
                    <span className="font-semibold text-gray-600 group-hover:text-gray-900 transition-colors duration-300 font-heading">
                      {company.name}
                    </span>
                  </div>
                  
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Stats mini-bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-gray-100"
        >
          {[
            { value: '100%', label: 'Cloud-Native' },
            { value: 'Enterprise', label: 'Security' },
            { value: 'Modern', label: 'Integrations' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center"
            >
              <p className="text-2xl font-bold text-gray-900 font-heading">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
