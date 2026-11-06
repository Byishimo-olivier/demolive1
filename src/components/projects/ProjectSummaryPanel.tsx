import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Briefcase, Building2, CalendarDays, ChevronRight, Loader2, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Permissions } from '@/constants/permissions';
import { cn } from '@/lib/utils';
import { projectApi, type ProjectFinancials } from '@/lib/project-api';
import type { Project } from '@/types';
import { ClientDetailsDialog } from './ClientDetailsDialog';
import { ContractDialog } from './ContractDialog';
import { ProfitBreakdownDialog } from './ProfitBreakdownDialog';

interface ProjectSummaryPanelProps {
  project: Project;
  timeline: { startDate: string | null; endDate: string | null };
  // Called with the saved project after the client or the contract changed
  onProjectChanged?: (project: Project) => void;
}

type Detail = 'client' | 'contract' | 'profit' | null;

const DAY = 86400000;

/** Summary cards of the project: client, contract, total income, total expenses, profit / loss, timeline */
export function ProjectSummaryPanel({ project, timeline, onProjectChanged }: ProjectSummaryPanelProps) {
  // Money on this page is always shown in Rwandan francs
  const { formatAmount } = useCurrency();
  const rwf = (n: number) => formatAmount(n, 'RWF');
  const [financials, setFinancials] = useState<ProjectFinancials | null>(null);
  const [failed, setFailed] = useState(false);
  const [detail, setDetail] = useState<Detail>(null);
  const { can } = useAuth();
  const canEditProject = can(Permissions.UPDATE_PROJECT);
  const navigate = useNavigate();
  const location = useLocation();

  // Open a tab of this project (and a Finance sub-tab)
  const openTab = (tab: string, section?: string) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    if (section) params.set('section', section);
    else params.delete('section');
    navigate(`${location.pathname}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const saved = (updated: Project) => onProjectChanged?.(updated);

  useEffect(() => {
    let cancelled = false;
    setFinancials(null);
    setFailed(false);
    projectApi
      .getProjectFinancials(project._id)
      .then((res) => !cancelled && setFinancials(res.data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [project._id, project.updatedAt]);

  const contract = financials?.contractAmount ?? project.contractAmount ?? 0;
  const profit = financials?.profitLoss ?? 0;
  const isProfit = profit >= 0;
  const loading = !financials && !failed;
  // A money figure, a spinner while loading, or a dash when not available to this user
  const money = (value?: number) => (financials ? rwf(value ?? 0) : loading ? <Spinner /> : <Muted>—</Muted>);

  const timelineText =
    timeline.startDate && timeline.endDate
      ? `${format(new Date(timeline.startDate), 'MMM d')} – ${format(new Date(timeline.endDate), 'MMM d, yyyy')}`
      : null;
  // Planned length and, while it runs, the days left
  const timelineSub = (() => {
    if (!timeline.startDate || !timeline.endDate) return null;
    const days = Math.max(1, Math.round((new Date(timeline.endDate).getTime() - new Date(timeline.startDate).getTime()) / DAY) + 1);
    const left = Math.ceil((new Date(timeline.endDate).getTime() - Date.now()) / DAY);
    if (left < 0) return `${days} days · ended ${-left} day${left === -1 ? '' : 's'} ago`;
    if (new Date(timeline.startDate).getTime() > Date.now()) return `${days} days · not started`;
    return `${days} days · ${left} day${left === 1 ? '' : 's'} left`;
  })();

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Project summary</h2>
      <p className="-mt-2 text-xs text-gray-500">Click a card to see its details.</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={Building2} label="Client" onClick={() => setDetail('client')} hint="Client details">
          {project.clientName || <Muted>Not set</Muted>}
          <Sub>{project.contactName || 'No contact person'}</Sub>
        </Tile>

        <Tile
          icon={Briefcase}
          label="Contract"
          onClick={() => setDetail('contract')}
          hint={project.contract ? 'Contract details' : canEditProject ? 'Create the contract' : 'Contract details'}
        >
          {contract ? rwf(contract) : <Muted>Not set</Muted>}
          <Sub>
            {project.contract?.reference || (project.contract ? 'Contract amount' : canEditProject ? 'No contract yet · create it' : 'No contract recorded')}
          </Sub>
        </Tile>

        <Tile icon={Wallet} label="Total income" onClick={() => openTab('finance', 'invoices')} hint="Open the invoices">
          {money(financials?.invoices.invoiced)}
          <Sub>{financials ? `Received ${rwf(financials.invoices.paid)}` : 'Approved and paid invoices'}</Sub>
        </Tile>

        <Tile icon={Receipt} label="Total expenses" onClick={() => openTab('finance', 'expenses')} hint="Open the expenses">
          {money(financials?.expenses.approved)}
          <Sub>
            {financials?.expenses.pending ? `+ ${rwf(financials.expenses.pending)} awaiting approval` : 'Approved expenses'}
          </Sub>
        </Tile>

        <Tile
          icon={isProfit ? TrendingUp : TrendingDown}
          label={isProfit ? 'Profit' : 'Loss'}
          tone={financials ? (isProfit ? 'good' : 'bad') : undefined}
          onClick={financials ? () => setDetail('profit') : undefined}
          hint="How it is worked out"
        >
          {financials ? rwf(Math.abs(profit)) : money()}
          <Sub>{financials?.marginPercent != null ? `${financials.marginPercent}% of income` : 'Income − expenses'}</Sub>
        </Tile>

        <Tile icon={CalendarDays} label="Timeline" onClick={() => openTab('timeline')} hint="Open the timeline">
          {timelineText || <Muted>No stages yet</Muted>}
          <Sub>{timelineSub || 'Plan the stages'}</Sub>
        </Tile>
      </div>

      <ClientDetailsDialog
        project={project}
        open={detail === 'client'}
        onOpenChange={(open) => !open && setDetail(null)}
        canEdit={canEditProject}
        onSaved={saved}
      />
      <ContractDialog
        project={project}
        financials={financials}
        open={detail === 'contract'}
        onOpenChange={(open) => !open && setDetail(null)}
        canEdit={canEditProject}
        onSaved={saved}
      />
      <ProfitBreakdownDialog
        financials={financials}
        open={detail === 'profit'}
        onOpenChange={(open) => !open && setDetail(null)}
        onOpenFinance={(section) => {
          setDetail(null);
          openTab('finance', section);
        }}
      />
    </section>
  );
}

function Tile({
  icon: Icon,
  label,
  tone,
  onClick,
  hint,
  children,
}: {
  icon: typeof Wallet;
  label: string;
  tone?: 'good' | 'bad';
  // Opens the card's details
  onClick?: () => void;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        'group h-full border-gray-200 p-3.5',
        onClick && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400'
      )}
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            title: hint,
            'aria-label': hint ? `${label}: ${hint}` : label,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            },
          }
        : {})}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Icon className={cn('h-3.5 w-3.5', tone === 'good' && 'text-emerald-600', tone === 'bad' && 'text-red-600')} />
        <span className="flex-1">{label}</span>
        {onClick && <ChevronRight className="h-3.5 w-3.5 text-gray-300 transition-colors group-hover:text-orange-500" />}
      </p>
      <div
        className={cn(
          'mt-1.5 break-words text-base font-semibold leading-snug',
          tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-900'
        )}
      >
        {children}
      </div>
    </Card>
  );
}

const Sub = ({ children }: { children: ReactNode }) => (
  <span className="mt-0.5 block text-xs font-normal text-gray-500">{children}</span>
);

const Muted = ({ children }: { children: ReactNode }) => <span className="font-normal text-gray-400">{children}</span>;

const Spinner = () => <Loader2 className="inline h-3.5 w-3.5 animate-spin text-gray-400" />;
