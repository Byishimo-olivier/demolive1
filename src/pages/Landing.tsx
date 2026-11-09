import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, BarChart3, FileText, Users, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/LandingNav';
import { BrandLogo } from '@/components/BrandLogo';
import { ImageCarousel3D } from '@/components/landing/3d/ImageCarousel3D';
import { landingGallery } from '@/components/landing/3d/gallery';
import { siteApi } from '@/lib/site-api';
import { TiltCard, Depth } from '@/components/landing/3d/TiltCard';
import { ScrollShowcase3D } from '@/components/landing/3d/ScrollShowcase3D';
import { FlipCard } from '@/components/landing/3d/FlipCard';

const IMG = '/images/landing';


const stats = [
  { value: '100%', label: 'Cloud-Native Platform' },
  { value: '0', label: 'Day Onboarding' },
  { value: 'Unlimited', label: 'Projects Capacity' },
  { value: '24/7', label: 'Priority Support' },
];

const features = [
  {
    icon: Building2,
    title: 'Project Management',
    description: 'End-to-end oversight of infrastructure projects with real-time tracking and milestone management.',
    image: `${IMG}/construction-site.webp`,
    imageAlt: 'Construction workers on a building site',
  },
  {
    icon: BarChart3,
    title: 'Financial Control',
    description: 'Complete budget visibility with automated tracking, variance analysis, and forecasting tools.',
    image: `${IMG}/finance-docs.webp`,
    imageAlt: 'Financial documents being reviewed beside a laptop',
  },
  {
    icon: FileText,
    title: 'Document Hub',
    description: 'Centralized document management with version control, approvals, and secure sharing.',
    image: `${IMG}/engineer.webp`,
    imageAlt: 'An engineer marking up technical drawings',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Streamlined communication across stakeholders with role-based access and notifications.',
    image: `${IMG}/team-collab.webp`,
    imageAlt: 'A team collaborating around a table with laptops',
  },
];

const roles = [
  {
    eyebrow: 'Focus on ROI',
    title: 'Built for Operations',
    footnote: 'Director of Operations',
    quote: 'Our platform is designed to transform how you manage your infrastructure portfolio with unmatched clarity.',
    image: `${IMG}/site-team.webp`,
    imageAlt: 'An operations team walking a construction site',
  },
  {
    eyebrow: 'Data-Driven Approach',
    title: 'Built for Leadership',
    footnote: 'CEO & Execs',
    quote: 'Reduce project delays with a platform that understands infrastructure complexity without adding more complexity.',
    image: `${IMG}/executive.webp`,
    imageAlt: 'A business executive in a suit',
  },
  {
    eyebrow: 'Seamless Workflows',
    title: 'Built for Managers',
    footnote: 'Project Manager',
    quote: 'Everything you need to keep teams aligned and executing perfectly across multiple project phases.',
    image: `${IMG}/presentation.webp`,
    imageAlt: 'A manager presenting to a team in an office',
  },
];

export function Landing() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  // Photos chosen by admins in Settings; the built-in ones show until they load (or if the API is down)
  const { data: uploadedImages } = useQuery({
    queryKey: ['landing-images'],
    queryFn: siteApi.listLandingImages,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // CTA background drifts slower than the page (parallax)
  const ctaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: ctaProgress } = useScroll({ target: ctaRef, offset: ['start end', 'end start'] });
  const ctaImageY = useTransform(ctaProgress, [0, 1], reduceMotion ? ['0%', '0%'] : ['-12%', '12%']);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-gray-100 pb-20 pt-28 lg:pb-24 lg:pt-32">
        {/* 3D perspective grid floor */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] overflow-hidden" style={{ perspective: 600 }}>
          <div className="landing-grid-floor absolute inset-x-[-50%] bottom-[-10%] h-[200%] origin-bottom" style={{ transform: 'rotateX(68deg)' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/40 to-white/0" />
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-orange-200/40 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-4 text-sm font-medium uppercase tracking-wide text-orange-700"
            >
              Infrastructure Project Management
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30, rotateX: -40 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformPerspective: 800, transformOrigin: 'bottom' }}
              className="font-heading text-5xl font-bold leading-[1.1] tracking-tight text-gray-900 md:text-6xl lg:text-7xl"
            >
              Build infrastructure
              <br />
              <span className="text-gray-400">with confidence</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-8 max-w-xl text-xl leading-relaxed text-gray-600"
            >
              The modern platform for infrastructure teams. Manage projects, track budgets,
              and collaborate seamlessly—all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row"
            >
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                className="h-12 rounded-lg bg-gray-900 px-8 font-medium text-white hover:bg-gray-800"
              >
                Start free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/features')}
                className="h-12 rounded-lg border-gray-300 bg-white/70 px-8 font-medium hover:bg-gray-50"
              >
                See how it works
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-6 text-sm text-gray-500"
            >
              No credit card required · 14-day free trial · Cancel anytime
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <ImageCarousel3D items={landingGallery(uploadedImages)} />
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, rotateX: -90 }}
                whileInView={{ opacity: 1, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformPerspective: 600, transformOrigin: 'top' }}
                className="text-center"
              >
                <p className="font-heading text-4xl font-bold text-gray-900 md:text-5xl">{stat.value}</p>
                <p className="mt-2 text-sm text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase: tips upright as you scroll */}
      <section className="border-b border-gray-100 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-heading text-3xl font-bold text-gray-900 md:text-4xl"
            >
              Every project, budget and team on one screen
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-lg text-gray-600"
            >
              From the site to the boardroom, see progress and spend the moment they change.
            </motion.p>
          </div>
          <ScrollShowcase3D />
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-gray-100 bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-2xl">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-heading text-3xl font-bold text-gray-900 md:text-4xl"
            >
              Everything you need to deliver projects on time and on budget
            </motion.h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40, rotateY: index % 2 ? -12 : 12 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay: (index % 2) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformPerspective: 1200 }}
              >
                <TiltCard className="h-full rounded-2xl">
                  <div className="absolute inset-0 rounded-2xl border border-gray-200 bg-white shadow-elev-1" />
                  <Depth z={20} className="relative p-3">
                    <div className="overflow-hidden rounded-xl">
                      <img
                        src={feature.image}
                        alt={feature.imageAlt}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[16/8] w-full object-cover"
                      />
                    </div>
                  </Depth>
                  <Depth z={45} className="relative -mt-10 px-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-900 text-white shadow-glow-orange">
                      <feature.icon className="h-6 w-6" />
                    </div>
                  </Depth>
                  <Depth z={30} className="relative px-8 pb-8 pt-5">
                    <h3 className="mb-3 font-heading text-xl font-semibold text-gray-900">{feature.title}</h3>
                    <p className="leading-relaxed text-gray-600">{feature.description}</p>
                    <Link
                      to="/features"
                      className="mt-6 inline-flex items-center text-sm font-medium text-gray-900 transition-colors hover:text-orange-700"
                    >
                      Learn more
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Depth>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="border-b border-gray-100 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500"
          >
            Designed for infrastructure professionals
          </motion.p>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {roles.map((role, index) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <FlipCard {...role} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div ref={ctaRef} className="relative overflow-hidden rounded-3xl bg-gray-900 p-8 text-center sm:p-12 md:p-16">
            <motion.img
              src={`${IMG}/skyline.webp`}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              style={{ y: ctaImageY }}
              className="absolute inset-x-0 -top-[15%] h-[130%] w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 via-gray-900/60 to-gray-950/90" />
            <div className="relative">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-heading text-3xl font-bold text-white md:text-4xl"
              >
                Ready to transform your project delivery?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mx-auto mt-4 max-w-2xl text-lg text-gray-300"
              >
                Sign up today and experience the future of infrastructure project management.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"
              >
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  className="h-12 rounded-lg bg-white px-8 font-medium text-gray-900 hover:bg-gray-100"
                >
                  Start free trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/contact')}
                  className="h-12 rounded-lg border-white/30 bg-white/5 px-8 font-medium text-white backdrop-blur hover:bg-white/15 hover:text-white"
                >
                  Schedule a demo
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <BrandLogo />
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Modern infrastructure project management for teams that build.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link to="/features" className="hover:text-gray-900">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-gray-900">Pricing</Link></li>
                <li><a href="#" className="hover:text-gray-900">Integrations</a></li>
                <li><a href="#" className="hover:text-gray-900">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">About</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900">Careers</a></li>
                <li><Link to="/contact" className="hover:text-gray-900">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link to="/privacy-policy" className="hover:text-gray-900">Privacy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-gray-900">Terms</Link></li>
                <li><a href="#" className="hover:text-gray-900">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} InfraSoko. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Twitter</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">LinkedIn</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
