import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LandingNav } from '@/components/LandingNav';
import { 
  Check, 
  X, 
  Building2, 
  ArrowRight,
  ChevronDown,
  Users,
  Shield,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const plans = [
  {
    name: 'Starter',
    description: 'For small teams getting started with project management.',
    price: { monthly: 29, annually: 24 },
    features: [
      { text: 'Up to 5 team members', included: true },
      { text: '3 active projects', included: true },
      { text: 'Basic reporting', included: true },
      { text: 'Email support', included: true },
      { text: 'Document storage (5GB)', included: true },
      { text: 'API access', included: false },
      { text: 'Custom integrations', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Dedicated account manager', included: false },
    ],
  },
  {
    name: 'Professional',
    description: 'For growing teams that need more power and flexibility.',
    price: { monthly: 79, annually: 66 },
    popular: true,
    features: [
      { text: 'Up to 25 team members', included: true },
      { text: 'Unlimited projects', included: true },
      { text: 'Advanced reporting', included: true },
      { text: 'Priority support', included: true },
      { text: 'Document storage (50GB)', included: true },
      { text: 'API access', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Advanced analytics', included: false },
      { text: 'Dedicated account manager', included: false },
    ],
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with complex requirements.',
    price: { monthly: 199, annually: 166 },
    features: [
      { text: 'Unlimited team members', included: true },
      { text: 'Unlimited projects', included: true },
      { text: 'Custom reporting', included: true },
      { text: '24/7 phone support', included: true },
      { text: 'Unlimited storage', included: true },
      { text: 'API access', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
  },
];

const faqs = [
  {
    question: 'Can I switch plans at any time?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate your billing accordingly.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, all plans come with a 14-day free trial. No credit card required to get started.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express) as well as bank transfers for annual plans.',
  },
  {
    question: 'Can I cancel at any time?',
    answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.',
  },
  {
    question: 'Do you offer discounts for non-profits?',
    answer: 'Yes, we offer special pricing for non-profit organizations and educational institutions. Contact our sales team for details.',
  },
  {
    question: 'What happens to my data if I cancel?',
    answer: 'Your data remains available for 30 days after cancellation. You can export all your data during this period.',
  },
];

const comparisonFeatures = [
  { name: 'Team members', starter: '5', professional: '25', enterprise: 'Unlimited' },
  { name: 'Active projects', starter: '3', professional: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Document storage', starter: '5GB', professional: '50GB', enterprise: 'Unlimited' },
  { name: 'API access', starter: false, professional: true, enterprise: true },
  { name: 'Custom integrations', starter: false, professional: true, enterprise: true },
  { name: 'Advanced analytics', starter: false, professional: false, enterprise: true },
  { name: 'Custom reporting', starter: false, professional: false, enterprise: true },
  { name: 'SSO/SAML', starter: false, professional: false, enterprise: true },
  { name: 'Dedicated support', starter: false, professional: false, enterprise: true },
];

export function Pricing() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-blue-700 tracking-wide uppercase mb-4"
          >
            Pricing
          </motion.p>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight font-heading"
          >
            Simple, transparent
            <br />
            <span className="text-gray-400">pricing for everyone</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Start with a 14-day free trial. No credit card required. 
            Choose the plan that fits your team.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 inline-flex items-center gap-3 p-1 bg-gray-100 rounded-full"
          >
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                billingPeriod === 'monthly'
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annually')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                billingPeriod === 'annually'
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Annually
              <span className="ml-2 text-xs font-semibold text-blue-700">Save 20%</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={cn(
                  "relative bg-white rounded-2xl p-8 border-2 transition-all",
                  plan.popular
                    ? "border-gray-900"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gray-900 text-white text-xs font-semibold rounded-full">
                    Most popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 font-heading">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-8">
                  <span className="text-5xl font-bold text-gray-900 font-heading">
                    ${plan.price[billingPeriod]}
                  </span>
                  <span className="text-gray-600 ml-2">
                    / month
                  </span>
                  {billingPeriod === 'annually' && (
                    <p className="mt-1 text-sm text-gray-500">
                      Billed annually
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => navigate('/register')}
                  className={cn(
                    "w-full h-12 rounded-lg font-medium mb-8",
                    plan.popular
                      ? "bg-gray-900 hover:bg-gray-800 text-white"
                      : "bg-white border-2 border-gray-200 text-gray-900 hover:bg-gray-50"
                  )}
                >
                  Start free trial
                </Button>

                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-gray-700 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={cn(
                        "text-sm",
                        feature.included ? "text-gray-700" : "text-gray-400"
                      )}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-24 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-heading">
              Compare plans
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              See what's included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-6 text-left text-sm font-medium text-gray-500">
                    Feature
                  </th>
                  <th className="py-4 px-6 text-center text-sm font-medium text-gray-900">
                    Starter
                  </th>
                  <th className="py-4 px-6 text-center text-sm font-medium text-gray-900 bg-gray-100">
                    Professional
                  </th>
                  <th className="py-4 px-6 text-center text-sm font-medium text-gray-900">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr key={feature.name} className="border-b border-gray-200">
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {feature.name}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {typeof feature.starter === 'boolean' ? (
                        feature.starter ? (
                          <Check className="h-5 w-5 text-gray-700 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-gray-700">{feature.starter}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center bg-gray-100">
                      {typeof feature.professional === 'boolean' ? (
                        feature.professional ? (
                          <Check className="h-5 w-5 text-gray-700 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-gray-700">{feature.professional}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {typeof feature.enterprise === 'boolean' ? (
                        feature.enterprise ? (
                          <Check className="h-5 w-5 text-gray-700 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-gray-700">{feature.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-heading">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Have questions? We have answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-gray-500 transition-transform",
                      expandedFaq === index ? "rotate-180" : ""
                    )}
                  />
                </button>
                <AnimatePresence>
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-gray-600">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-gray-900 rounded-3xl p-12 md:p-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white font-heading">
                  Need a custom solution?
                </h2>
                <p className="mt-4 text-lg text-gray-400">
                  Get a tailored plan that matches your organization's specific requirements. 
                  Our enterprise team will work with you to create the perfect solution.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    'Custom contract terms',
                    'Dedicated account manager',
                    'On-premise deployment',
                    'Custom integrations',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-300">
                      <Check className="h-5 w-5 text-white" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="h-12 px-8 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-medium"
                  >
                    Contact sales
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: Users, value: '500+', label: 'Enterprise clients' },
                  { icon: Shield, value: '99.9%', label: 'Uptime SLA' },
                  { icon: Zap, value: '24/7', label: 'Support' },
                  { icon: Building2, value: '50+', label: 'Countries' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-800 rounded-xl p-6 text-center">
                    <stat.icon className="h-6 w-6 text-gray-400 mx-auto mb-3" />
                    <p className="text-2xl font-bold text-white font-heading">{stat.value}</p>
                    <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 font-heading">InfraSoko</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6 text-sm text-gray-500 mt-4 md:mt-0">
              <Link to="/privacy-policy" className="hover:text-gray-900">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-gray-900">Terms of Service</Link>
              <p>
                © {new Date().getFullYear()} InfraSoko. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
