import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CreditCard,
  Repeat,
} from 'lucide-react';
import {
  subscriptionApi,
  Plan,
  PlanId,
} from '@/lib/subscription-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error-handler';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  selectedPlan?: Plan | null;
  currentPlan?: PlanId;
  companyId?: string;
  onSuccess?: (redirectUrl?: string) => void;
  onError?: (error: string) => void;
}

type PaymentStep = 'select' | 'processing';

export function PaymentModal({
  open,
  onOpenChange,
  plans,
  selectedPlan: initialPlan,
  currentPlan,
  companyId,
  onSuccess,
  onError,
}: PaymentModalProps) {
  const { formatAmount } = useCurrency();
  const [step, setStep] = useState<PaymentStep>('select');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(initialPlan || null);
  const [loading, setLoading] = useState(false);
  const [enableRecurring, setEnableRecurring] = useState(true);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedPlan(initialPlan || null);
      setEnableRecurring(true);
      setStep('select');
    }
  }, [open, initialPlan]);

  const handlePlanSelect = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
    }
  };

  const handleInitiatePayment = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    setLoading(true);
    setStep('processing');
    try {
      const result = await subscriptionApi.initiatePayment({
        planId: selectedPlan.id,
        companyId,
        enableRecurring,
      });

      const paymentId = result.paymentId || result.referenceId;
      if (paymentId) {
        sessionStorage.setItem('pendingPaymentId', paymentId);
      }
      // Let the parent component (Billing) handle the redirect to Pesapal
      onSuccess?.(result.redirectUrl);
    } catch (error: unknown) {
      console.error('Payment initiation failed:', error);
      const message = getErrorMessage(error, 'Failed to initiate payment');
      toast.error(message);
      onError?.(message);
      setStep('select');
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };


  const availablePlans = plans.filter((p) => p.price > 0);
  const upgradePlans = currentPlan
    ? availablePlans.filter((p) => {
        const currentPlanData = plans.find((cp) => cp.id === currentPlan);
        return currentPlanData ? p.price > currentPlanData.price : true;
      })
    : availablePlans;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {step === 'select' && 'Select a Plan'}
            {step === 'processing' && 'Redirecting to Pesapal'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Choose the plan you want to subscribe to'}
            {step === 'processing' && 'You will be redirected to the secure Pesapal payment page'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plan Selection Step */}
          {step === 'select' && (
            <>
              <div className="space-y-2">
                <Label>Select Plan</Label>
                <Select
                  value={selectedPlan?.id}
                  onValueChange={handlePlanSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {upgradePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{plan.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {formatAmount(plan.price)}/mo
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlan && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{selectedPlan.name} Plan</span>
                    <Badge>{formatAmount(selectedPlan.price)}/month</Badge>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      {selectedPlan.features.maxProjects === Infinity
                        ? 'Unlimited'
                        : selectedPlan.features.maxProjects}{' '}
                      projects
                    </li>
                    <li>
                      {selectedPlan.features.maxUsers === Infinity
                        ? 'Unlimited'
                        : selectedPlan.features.maxUsers}{' '}
                      team members
                    </li>
                    <li>
                      {selectedPlan.features.storageGB === Infinity
                        ? 'Unlimited'
                        : `${selectedPlan.features.storageGB} GB`}{' '}
                      storage
                    </li>
                  </ul>
                </div>
              )}

              {/* Recurring / Auto-Renewal Toggle */}
              {selectedPlan && selectedPlan.price > 0 && (
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Switch
                    id="enable-recurring"
                    checked={enableRecurring}
                    onCheckedChange={setEnableRecurring}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="enable-recurring" className="font-medium cursor-pointer">
                      <Repeat className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                      Auto-renewal (recurring payment)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Your card will be charged <strong>{formatAmount(selectedPlan.price)}/month</strong> automatically.
                      You can cancel anytime from your Pesapal dashboard.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleInitiatePayment} disabled={!selectedPlan || loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue to Payment
                </Button>
              </div>
            </>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="relative mx-auto w-16 h-16 mb-4 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h3 className="font-medium mb-2">Redirecting to Pesapal</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please wait while we redirect you to the secure payment page...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
