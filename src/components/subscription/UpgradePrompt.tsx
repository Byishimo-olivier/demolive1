import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowUpCircle, Zap, Crown } from 'lucide-react';
import { PlanId, Plan, getPlanDisplayInfo } from '@/lib/subscription-api';
import { PaymentModal } from './PaymentModal';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  requiredPlan: PlanId;
  currentPlan?: PlanId;
  plans?: Plan[];
  companyId?: string;
  variant?: 'inline' | 'card' | 'banner';
  onUpgradeComplete?: () => void;
}

export function UpgradePrompt({
  feature,
  requiredPlan,
  currentPlan,
  plans,
  companyId,
  variant = 'card',
  onUpgradeComplete,
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const requiredPlanInfo = getPlanDisplayInfo(requiredPlan);
  const selectedPlan = plans?.find((p) => p.id === requiredPlan);

  const handleUpgradeClick = () => {
    if (plans && selectedPlan) {
      setPaymentModalOpen(true);
    } else {
      navigate('/billing');
    }
  };

  const handleSuccess = () => {
    setPaymentModalOpen(false);
    onUpgradeComplete?.();
  };

  // Inline variant - compact for use within existing UI
  if (variant === 'inline') {
    return (
      <>
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <Lock className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">
            {feature} requires{' '}
            <Badge variant="outline" className="mx-1">
              {requiredPlanInfo.badge}
            </Badge>{' '}
            plan
          </span>
          <Button size="sm" variant="outline" onClick={handleUpgradeClick}>
            Upgrade
          </Button>
        </div>

        {plans && selectedPlan && (
          <PaymentModal
            open={paymentModalOpen}
            onOpenChange={setPaymentModalOpen}
            plans={plans}
            selectedPlan={selectedPlan}
            currentPlan={currentPlan}
            companyId={companyId}
            onSuccess={handleSuccess}
          />
        )}
      </>
    );
  }

  // Banner variant - full width notification
  if (variant === 'banner') {
    return (
      <>
        <div className="w-full p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Upgrade to unlock {feature}</h4>
                <p className="text-sm text-muted-foreground">
                  This feature is available on the {requiredPlanInfo.badge} plan and above
                </p>
              </div>
            </div>
            <Button onClick={handleUpgradeClick}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>

        {plans && selectedPlan && (
          <PaymentModal
            open={paymentModalOpen}
            onOpenChange={setPaymentModalOpen}
            plans={plans}
            selectedPlan={selectedPlan}
            currentPlan={currentPlan}
            companyId={companyId}
            onSuccess={handleSuccess}
          />
        )}
      </>
    );
  }

  // Card variant - default, for feature gates
  return (
    <>
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Upgrade Required</CardTitle>
          <CardDescription>{feature} is a premium feature</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Upgrade to the{' '}
            <Badge
              className={
                requiredPlan === PlanId.ENTERPRISE
                  ? 'bg-purple-100 text-purple-800'
                  : requiredPlan === PlanId.PROFESSIONAL
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
              }
            >
              {requiredPlanInfo.badge}
            </Badge>{' '}
            plan to access this feature
          </p>
          <Button onClick={handleUpgradeClick} className="w-full">
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Upgrade to {requiredPlanInfo.badge}
          </Button>
        </CardContent>
      </Card>

      {plans && selectedPlan && (
        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          plans={plans}
          selectedPlan={selectedPlan}
          currentPlan={currentPlan}
          companyId={companyId}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

// Simple feature gate wrapper component
interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  requiredPlan: PlanId;
  currentPlan?: PlanId;
  hasAccess: boolean;
  plans?: Plan[];
  companyId?: string;
}

export function FeatureGate({
  children,
  feature,
  requiredPlan,
  currentPlan,
  hasAccess,
  plans,
  companyId,
}: FeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <UpgradePrompt
      feature={feature}
      requiredPlan={requiredPlan}
      currentPlan={currentPlan}
      plans={plans}
      companyId={companyId}
    />
  );
}

// Usage limit warning component
interface UsageLimitWarningProps {
  current: number;
  max: number;
  resourceName: string;
  requiredPlan: PlanId;
  currentPlan?: PlanId;
}

export function UsageLimitWarning({
  current,
  max,
  resourceName,
  requiredPlan,
  currentPlan,
}: UsageLimitWarningProps) {
  const percentage = max === Infinity ? 0 : (current / max) * 100;
  const isAtLimit = current >= max;
  const isNearLimit = percentage >= 80;

  if (!isNearLimit && !isAtLimit) {
    return null;
  }

  const navigate = useNavigate();

  return (
    <div
      className={`p-3 rounded-lg border ${
        isAtLimit
          ? 'bg-red-50 border-red-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAtLimit ? (
            <Lock className="h-4 w-4 text-red-600" />
          ) : (
            <Zap className="h-4 w-4 text-yellow-600" />
          )}
          <span
            className={`text-sm ${isAtLimit ? 'text-red-800' : 'text-yellow-800'}`}
          >
            {isAtLimit
              ? `You've reached the ${resourceName} limit (${current}/${max})`
              : `You're using ${current} of ${max} ${resourceName}`}
          </span>
        </div>
        <Button
          size="sm"
          variant={isAtLimit ? 'default' : 'outline'}
          onClick={() => navigate('/billing')}
        >
          Upgrade
        </Button>
      </div>
    </div>
  );
}
