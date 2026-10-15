import React, { useState } from 'react';
import { Gavel, ListTodo, BarChart3, Users, PieChart, Bell, MessageSquare, FileText, CheckCircle2, Clock, DollarSign, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const features = [
  {
    id: 'bidding',
    icon: Gavel,
    name: 'Project Bidding',
    title: 'Effortlessly Manage Bids and Contracts',
    description: 'Streamline your bidding process with our comprehensive bidding management system. Create, track, and evaluate bids in real-time while ensuring fair competition and transparent contract management.',
    color: 'blue',
    mockup: {
      title: 'Active Bids',
      items: [
        { name: 'City Infrastructure Upgrade', amount: '$1.2M', status: 'Under Review', deadline: '2 days left', bidders: 5 },
        { name: 'Highway Maintenance', amount: '$800K', status: 'Open', deadline: '5 days left', bidders: 3 },
        { name: 'Bridge Construction', amount: '$2.5M', status: 'Awarded', deadline: 'Completed', bidders: 8 },
      ]
    }
  },
  {
    id: 'tasks',
    icon: ListTodo,
    name: 'Task Management',
    title: 'Organize and Track Every Detail',
    description: 'Keep your projects on schedule with intuitive task management. Assign tasks, set milestones, and monitor progress with beautiful visual timelines.',
    color: 'green',
    mockup: {
      title: 'Project Tasks',
      items: [
        { name: 'Foundation Work', status: 'In Progress', progress: 75 },
        { name: 'Electrical Setup', status: 'Pending', progress: 0 },
        { name: 'Safety Inspection', status: 'Completed', progress: 100 },
      ]
    }
  },
  {
    id: 'resources',
    icon: Users,
    name: 'Resource Planning',
    title: 'Optimize Your Team & Equipment',
    description: 'Allocate resources efficiently with smart scheduling. Track equipment, manage teams, and ensure optimal utilization across all your projects.',
    color: 'purple',
    mockup: {
      title: 'Resource Overview',
      items: [
        { team: 'Engineering', members: 24, utilization: '85%', projects: 5, availability: 'High' },
        { team: 'Construction', members: 48, utilization: '92%', projects: 8, availability: 'Medium' },
        { team: 'Design', members: 12, utilization: '78%', projects: 3, availability: 'High' },
      ]
    }
  },
  {
    id: 'analytics',
    icon: PieChart,
    name: 'Analytics',
    title: 'Data-Driven Project Insights',
    description: 'Make informed decisions with powerful analytics. Generate custom reports, visualize metrics, and identify trends for better outcomes.',
    color: 'orange',
    mockup: {
      title: 'Performance Metrics',
      items: [
        { metric: 'Project Completion', value: '92%', trend: 'up', change: '+5%' },
        { metric: 'Budget Variance', value: '-2.5%', trend: 'down', change: 'Under budget' },
        { metric: 'Team Efficiency', value: '88%', trend: 'up', change: '+12%' },
      ]
    }
  }
];

const colorClasses = {
  blue: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-600' },
  green: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-600', border: 'border-green-200', gradient: 'from-green-500 to-emerald-600' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', gradient: 'from-purple-500 to-violet-600' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', gradient: 'from-orange-500 to-amber-600' },
};

export function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(features[0]);
  const colors = colorClasses[activeFeature.color as keyof typeof colorClasses];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7 }}
      className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden"
      aria-label="Features"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-64 w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 -left-64 w-[500px] h-[500px] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-purple-200/50 mb-6"
          >
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Powerful Features</span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 font-heading mb-6">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              succeed
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive tools designed specifically for infrastructure project management
          </p>
        </motion.div>

        {/* Feature tabs */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            const isActive = activeFeature.id === feature.id;
            const featureColors = colorClasses[feature.color as keyof typeof colorClasses];
            
            return (
              <motion.button
                key={feature.id}
                onClick={() => setActiveFeature(feature)}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all duration-300 border-2",
                  isActive
                    ? `bg-gradient-to-r ${featureColors.gradient} text-white border-transparent shadow-lg`
                    : `bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-md`
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : featureColors.text)} />
                <span className="hidden sm:inline">{feature.name}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Feature content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFeature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Left - Content */}
            <div className="order-2 lg:order-1">
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colors.light} ${colors.text} text-sm font-medium mb-4`}>
                  <activeFeature.icon className="h-4 w-4" />
                  {activeFeature.name}
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 font-heading mb-6">
                  {activeFeature.title}
                </h3>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  {activeFeature.description}
                </p>
                
                {/* Feature highlights */}
                <div className="space-y-4 mb-8">
                  {['Real-time updates & notifications', 'Collaborative workflow tools', 'Advanced reporting & exports'].map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className={`w-6 h-6 rounded-full ${colors.light} flex items-center justify-center`}>
                        <CheckCircle2 className={`h-4 w-4 ${colors.text}`} />
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className={`inline-flex items-center gap-2 ${colors.text} font-semibold group`}
                >
                  Learn more about {activeFeature.name}
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            </div>

            {/* Right - Mockup */}
            <div className="order-1 lg:order-2">
              <motion.div
                initial={{ x: 30, opacity: 0, rotateY: 10 }}
                animate={{ x: 0, opacity: 1, rotateY: 0 }}
                transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
                className="relative"
              >
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} opacity-20 blur-3xl scale-110 rounded-3xl`} />
                
                <div className={`relative bg-white rounded-3xl shadow-2xl border ${colors.border} overflow-hidden`}>
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="bg-white rounded-lg px-4 py-1 text-xs text-gray-500 border">
                        app.infrasoko.com/{activeFeature.id}
                      </div>
                    </div>
                  </div>

                  {/* Mockup content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-semibold text-gray-900">{activeFeature.mockup.title}</h4>
                      <div className="flex gap-2">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                        >
                          <Bell className="h-4 w-4 text-gray-500" />
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                        >
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                        </motion.div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {activeFeature.mockup.items.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          whileHover={{ scale: 1.02, x: 4 }}
                          className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer border border-gray-100"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {'name' in item ? item.name : 'team' in item ? item.team : item.metric}
                            </span>
                            {'status' in item && (
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                item.status === 'In Progress' || item.status === 'Under Review' 
                                  ? "bg-blue-100 text-blue-700"
                                  : item.status === 'Completed' || item.status === 'Awarded'
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              )}>
                                {item.status}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {'amount' in item && (
                              <>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {item.amount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.deadline}
                                </span>
                              </>
                            )}
                            {'progress' in item && (
                              <div className="flex-1">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <motion.div
                                    className={`h-full bg-gradient-to-r ${colors.gradient}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.progress}%` }}
                                    transition={{ delay: 0.6 + index * 0.1, duration: 0.8 }}
                                  />
                                </div>
                              </div>
                            )}
                            {'utilization' in item && (
                              <>
                                <span>{item.members} members</span>
                                <span>{item.utilization} utilized</span>
                              </>
                            )}
                            {'value' in item && 'trend' in item && (
                              <>
                                <span className="text-lg font-bold text-gray-900">{item.value}</span>
                                <span className={item.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                                  {item.change}
                                </span>
                              </>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating decorative elements */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg flex items-center justify-center"
                >
                  <Sparkles className="h-8 w-8 text-white" />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
