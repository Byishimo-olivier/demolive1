import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import { db } from '@/lib/db';
import { getErrorMessage } from '@/utils/error-handler';

const formSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  receiptNumber: z.string().min(1, 'Receipt number is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  receiptDate: z.string().min(1, 'Receipt date is required'),
  description: z.string().min(1, 'Description is required'),
  notes: z.string(),
});

type ReceiptFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: any | null;
  onSuccess: () => void;
  projectId: string;
};

export function ReceiptForm({
  open,
  onOpenChange,
  receipt,
  onSuccess,
  projectId,
}: ReceiptFormProps) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: receipt || {
      projectId,
      receiptNumber: `REC-${Date.now()}`,
      paymentId: '',
      amount: 0,
      receiptDate: new Date().toISOString().split('T')[0],
      description: '',
      notes: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const receiptData = {
        ...data,
        id: receipt?.id || crypto.randomUUID(),
        createdAt: receipt?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.put('receipts', receiptData);
      toast.success(
        `Receipt ${receipt ? 'updated' : 'recorded'} successfully`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast.error(getErrorMessage(error, `Failed to ${receipt ? 'update' : 'record'} receipt`));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {receipt ? 'Edit Receipt' : 'Record New Receipt'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project ID</FormLabel>
                    <FormControl>
                      <Input {...field} value={projectId} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Number</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {receipt ? 'Update Receipt' : 'Record Receipt'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 
