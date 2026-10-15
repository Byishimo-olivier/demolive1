import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Crown,
  Zap,
  RefreshCw,
  ArrowUpCircle,
} from 'lucide-react';
import {
  subscriptionApi,
  Plan,
  Payment,
  SubscriptionStatus,
  PlanId,
  PaymentStatus,
  getPlanDisplayInfo,
} from '@/lib/subscription-api';
import { PaymentModal } from '@/components/subscription/PaymentModal';
import toast from 'react-hot-toast';

export function Billing() {
  const { formatAmount } = useCurrency();
  const { user, activeProfile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const companyId = activeProfile?.type === 'organization' ? activeProfile.id : undefined;

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Detect return from Pesapal (cancel or redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderTrackingId = params.get('OrderTrackingId');

    if (orderTrackingId) {
      // Clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('OrderTrackingId');
      url.searchParams.delete('OrderMerchantReference');
      window.history.replaceState({}, '', url.toString());

      // Find the matching pending payment and cancel it
      const cancelAbandonedPayment = async () => {
        try {
          // Get the most recent pending payment
          const payments = await subscriptionApi.getPaymentHistory(companyId);
          const pendingPayment = payments.find(
            (p) =>
              p.status === PaymentStatus.PENDING &&
              (p.providerOrderTrackingId === orderTrackingId ||
                p.providerReferenceId === orderTrackingId)
          );

          if (pendingPayment) {
            // Check with Pesapal what happened
            const txStatus = await subscriptionApi.getPesapalTransactionStatus(orderTrackingId).catch(() => null);
            const isCancelled = !txStatus || txStatus.status === 'NOT_FOUND' || txStatus.status === 'FAILED';

            if (isCancelled) {
              await subscriptionApi.cancelPayment(pendingPayment._id);
              toast.error('Payment was cancelled.');
              loadData();
            } else if (txStatus.status === 'COMPLETED') {
              toast.success('Payment confirmed! Your subscription is active.');
              loadData();
            }
          }
        } catch (error) {
          console.error('Error handling payment return:', error);
        }
      };

      cancelAbandonedPayment();
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, statusData, paymentsData] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getSubscriptionStatus(companyId),
        subscriptionApi.getPaymentHistory(companyId),
      ]);
      setPlans(plansData);
      setSubscriptionStatus(statusData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setPaymentModalOpen(true);
  };

  const handleRenew = () => {
    const currentPlan = plans.find((p) => p.id === subscriptionStatus?.plan);
    if (currentPlan) {
      setSelectedPlan(currentPlan);
      setPaymentModalOpen(true);
    }
  };

  const handlePaymentSuccess = (redirectUrl?: string) => {
    setPaymentModalOpen(false);
    setSelectedPlan(null);
    
    if (redirectUrl) {
      // Redirect to Pesapal payment page
      setIsRedirecting(true);
      toast.loading('Redirecting to Pesapal payment page...');
      window.location.href = redirectUrl;
    } else {
      // No redirectUrl in response — Pesapal submitOrder likely failed
      // or backend env vars are not configured
      loadData();
      toast.error(
        'Could not reach Pesapal payment page'
      );
    }
  };

  const handlePaymentError = (error: string) => {
    toast.error(error || 'Failed to initiate payment. Please try again.');
    setPaymentModalOpen(false);
    setSelectedPlan(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.SUCCESSFUL:
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Successful
          </Badge>
        );
      case PaymentStatus.FAILED:
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case PaymentStatus.PENDING:
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case PaymentStatus.PROCESSING:
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const currentPlan = plans.find((p) => p.id === subscriptionStatus?.plan);
  const planInfo = subscriptionStatus ? getPlanDisplayInfo(subscriptionStatus.plan) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <RefreshCw className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Redirecting to Pesapal...</p>
        <p className="text-sm text-muted-foreground">
          You will be redirected to the secure payment page.
        </p>
        <Button 
          variant="outline" 
          onClick={() => {
            setIsRedirecting(false);
            loadData();
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription plan and view payment history
        </p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            {activeProfile?.type === 'organization'
              ? `Subscription for ${activeProfile.name}`
              : 'Your personal subscription'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptionStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-bold">{currentPlan?.name || 'Basic'} Plan</h3>
                    {getStatusBadge(subscriptionStatus.status)}
                  </div>
                  {subscriptionStatus.isActive && subscriptionStatus.endDate && (
                    <p className="text-sm text-muted-foreground">
                      Expires: {new Date(subscriptionStatus.endDate).toLocaleDateString()}
                      {subscriptionStatus.daysRemaining !== undefined && (
                        <span className="ml-2">
                          ({subscriptionStatus.daysRemaining} days remaining)
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {subscriptionStatus.canRenew && (
                    <Button onClick={handleRenew} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Renew
                    </Button>
                  )}
                  {subscriptionStatus.canUpgrade && (
                    <Button onClick={() => setPaymentModalOpen(true)}>
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>

              {/* Expiry Warning */}
              {subscriptionStatus.isActive &&
                subscriptionStatus.daysRemaining !== undefined &&
                subscriptionStatus.daysRemaining <= 7 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      Your subscription expires soon. Renew now to avoid service interruption.
                    </p>
                  </div>
                )}

              {/* Plan Features */}
              {currentPlan && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Projects</p>
                    <p className="font-medium">
                      {currentPlan.features.maxProjects === Infinity
                        ? 'Unlimited'
                        : currentPlan.features.maxProjects}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                    <p className="font-medium">
                      {currentPlan.features.maxUsers === Infinity
                        ? 'Unlimited'
                        : currentPlan.features.maxUsers}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Storage</p>
                    <p className="font-medium">
                      {currentPlan.features.storageGB === Infinity
                        ? 'Unlimited'
                        : `${currentPlan.features.storageGB} GB`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No active subscription</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a plan below to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Available Plans
          </CardTitle>
          <CardDescription>Choose the plan that best fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = subscriptionStatus?.plan === plan.id;
              const canSelectPlan =
                !isCurrentPlan &&
                (!currentPlan || plan.price > currentPlan.price || subscriptionStatus?.canRenew);

              return (
                <div
                  key={plan.id}
                  className={`relative p-4 border rounded-lg ${
                    isCurrentPlan ? 'border-primary bg-primary/5' : 'border-gray-200'
                  } ${plan.id === PlanId.PROFESSIONAL ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {plan.id === PlanId.PROFESSIONAL && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-600">Most Popular</Badge>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-2">
                      <Badge className="bg-green-600">Current</Badge>
                    </div>
                  )}

                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    {plan.price > 0 ? (
                      <p className="text-2xl font-bold">
                        {formatAmount(plan.price)}
                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                      </p>
                    ) : (
                      <p className="text-2xl font-bold">Custom</p>
                    )}
                  </div>

                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {plan.features.maxProjects === Infinity
                        ? 'Unlimited'
                        : plan.features.maxProjects}{' '}
                      projects
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {plan.features.maxUsers === Infinity ? 'Unlimited' : plan.features.maxUsers}{' '}
                      team members
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {plan.features.storageGB === Infinity
                        ? 'Unlimited'
                        : `${plan.features.storageGB} GB`}{' '}
                      storage
                    </li>
                    {plan.features.canCreateInvoices && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Invoice creation
                      </li>
                    )}
                    {plan.features.canAccessBidding && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Bidding access
                      </li>
                    )}
                    {plan.features.hasAdvancedReporting && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Advanced reporting
                      </li>
                    )}
                    {plan.features.hasApiAccess && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        API access
                      </li>
                    )}
                  </ul>

                  <Button
                    className="w-full mt-4"
                    variant={isCurrentPlan ? 'outline' : 'default'}
                    disabled={!canSelectPlan || plan.price < 0}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {isCurrentPlan
                      ? 'Current Plan'
                      : plan.price < 0
                        ? 'Contact Sales'
                        : currentPlan && plan.price > currentPlan.price
                          ? 'Upgrade'
                          : 'Select'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Your recent payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell>
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize">{payment.planId}</TableCell>
                    <TableCell>
                      {formatAmount(payment.amount)} {payment.currency}
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.providerTransactionId || payment.providerReferenceId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No payment history</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your payments will appear here once you subscribe
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-blue-800">
            <CreditCard className="h-4 w-4 inline mr-2" />
            Supported Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700">
            We accept payments via MTN MoMo, Airtel Money, Visa, and Mastercard through Pesapal.
            You will be redirected to the secure Pesapal payment page to complete your transaction.
          </p>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        plans={plans}
        selectedPlan={selectedPlan}
        currentPlan={subscriptionStatus?.plan}
        companyId={companyId}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
}