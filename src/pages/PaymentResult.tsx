import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentStatus, pollPaymentStatus, subscriptionApi } from '@/lib/subscription-api';
import toast from 'react-hot-toast';

export function PaymentResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'polling' | 'success' | 'failed'>('polling');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const paymentId = sessionStorage.getItem('pendingPaymentId');
    const orderTrackingId = searchParams.get('OrderTrackingId') || searchParams.get('order_tracking_id');

    if (paymentId) {
      // Primary flow: poll using our internal payment ID
      const stopper = pollPaymentStatus(
        paymentId,
        (paymentStatus) => {
          if (paymentStatus.status === PaymentStatus.SUCCESSFUL) {
            setStatus('success');
            setMessage('Payment successful! Your subscription is now active.');
            sessionStorage.removeItem('pendingPaymentId');
            stopper.stop();
          } else if (paymentStatus.status === PaymentStatus.FAILED) {
            setStatus('failed');
            setMessage(paymentStatus.failureReason || 'Payment failed. Please try again.');
            sessionStorage.removeItem('pendingPaymentId');
            stopper.stop();
          } else if (paymentStatus.status === PaymentStatus.CANCELLED) {
            setStatus('failed');
            setMessage('Payment was cancelled.');
            sessionStorage.removeItem('pendingPaymentId');
            stopper.stop();
          }
        },
        3000,
        60
      );

      return () => {
        stopper.stop();
      };
    } else if (orderTrackingId) {
      // Fallback: Pesapal returned with OrderTrackingId — check via the transaction status API
      setMessage('Verifying payment with Pesapal...');

      const checkPesapalStatus = async () => {
        try {
          const transaction = await subscriptionApi.getPesapalTransactionStatus(orderTrackingId);
          const txStatus = transaction?.status?.toUpperCase();

          if (txStatus === 'COMPLETED') {
            setStatus('success');
            setMessage('Payment successful! Your subscription is now active.');
          } else if (txStatus === 'FAILED') {
            setStatus('failed');
            setMessage(transaction?.statusMessage || 'Payment failed. Please try again.');
          } else {
            // PENDING — wait and retry a few times
            let attempts = 0;
            const maxAttempts = 20;
            const checkAgain = () => {
              attempts++;
              if (attempts >= maxAttempts) {
                setMessage('Payment is still being processed. Please check your billing page.');
                toast('Payment is still processing. Check back in a few minutes.');
                return;
              }
              setTimeout(async () => {
                try {
                  const retryTx = await subscriptionApi.getPesapalTransactionStatus(orderTrackingId);
                  const retryStatus = retryTx?.status?.toUpperCase();
                  if (retryStatus === 'COMPLETED') {
                    setStatus('success');
                    setMessage('Payment successful! Your subscription is now active.');
                  } else if (retryStatus === 'FAILED') {
                    setStatus('failed');
                    setMessage(retryTx?.statusMessage || 'Payment failed.');
                  } else {
                    checkAgain();
                  }
                } catch {
                  checkAgain();
                }
              }, 5000);
            };
            setTimeout(checkAgain, 5000);
          }
        } catch (error) {
          console.error('Error checking Pesapal transaction status:', error);
          setMessage('Payment is being processed. Please check your billing page.');
          toast('We are confirming your payment. Check your billing page for updates.');
        }
      };

      checkPesapalStatus();
    } else {
      // No payment info found
      toast.error('No pending payment found.');
      navigate('/billing');
    }
  }, [navigate, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      {status === 'polling' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-2xl font-semibold">Processing Payment</h2>
          <p className="text-muted-foreground">{message}</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-semibold">Payment Successful</h2>
          <p className="text-muted-foreground">{message}</p>
          <Button onClick={() => navigate('/billing')} className="mt-4">
            Return to Billing
          </Button>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex flex-col items-center gap-4">
          <XCircle className="h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-semibold">Payment Failed</h2>
          <p className="text-muted-foreground">{message}</p>
          <Button onClick={() => navigate('/billing')} variant="outline" className="mt-4">
            Return to Billing
          </Button>
        </div>
      )}
    </div>
  );
}
