import { useNavigate } from 'react-router-dom';
import { LogOut, PhoneCall, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_CONTACT } from '../demo/demo-mode';
import { Button } from './ui/button';

/** Shown on every page while someone explores the demo: what it is, and how to get a real account */
export function DemoBanner() {
  const { isDemo, signOut } = useAuth();
  const navigate = useNavigate();
  if (!isDemo) return null;

  const contactHref = DEMO_CONTACT.whatsapp
    ? `https://wa.me/${DEMO_CONTACT.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Hello, I tried the InfraSoko demo and would like my own account.')}`
    : DEMO_CONTACT.phone
      ? `tel:${DEMO_CONTACT.phone.replace(/\s+/g, '')}`
      : DEMO_CONTACT.email
        ? `mailto:${DEMO_CONTACT.email}?subject=${encodeURIComponent('InfraSoko account request')}`
        : '/contact';

  const exitDemo = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
        <div className="text-sm">
          <p className="font-semibold text-gray-900">You are exploring a live demo with sample data</p>
          <p className="text-gray-600">
            Click around and try anything — changes stay in your browser only.
            {DEMO_CONTACT.phone && <> Call us on <span className="font-medium text-gray-900">{DEMO_CONTACT.phone}</span> to get your own workspace.</>}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button asChild size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
          <a href={contactHref} target={contactHref.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
            <PhoneCall className="mr-2 h-4 w-4" />
            Get your own account
          </a>
        </Button>
        <Button size="sm" variant="outline" className="border-orange-200 bg-white" onClick={exitDemo}>
          <LogOut className="mr-2 h-4 w-4" />
          Exit demo
        </Button>
      </div>
    </div>
  );
}
