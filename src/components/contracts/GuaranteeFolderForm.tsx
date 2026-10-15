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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import { db } from '@/lib/db';
import type { Guarantee, GuaranteeType } from '@/types/contracts';

const formSchema = z.object({
  guaranteeId: z.string().min(1, 'Guarantee ID is required'),
  contractId: z.string().min(1, 'Contract ID is required'),
  type: z.enum(['performance', 'advance_payment', 'retention', 'bid'] as const),
  issuingBank: z.string().min(1, 'Issuing bank is required'),
  value: z.number().min(0, 'Value must be positive'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  document: z.object({
    name: z.string(),
    url: z.string(),
    uploadedAt: z.string(),
  }),
  status: z.enum(['active', 'expired', 'released']),
});

type GuaranteeFolderFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guarantee: Guarantee | null;
  onSuccess: () => void;
};

export function GuaranteeFolderForm({
  open,
  onOpenChange,
  guarantee,
  onSuccess,
}: GuaranteeFolderFormProps) {
  const form = useForm<Guarantee>({
    resolver: zodResolver(formSchema),
    defaultValues: guarantee || {
      guaranteeId: `GRT-${Date.now()}`,
      contractId: '',
      type: 'performance',
      issuingBank: '',
      value: 0,
      startDate: '',
      endDate: '',
      document: {
        name: '',
        url: '',
        uploadedAt: new Date().toISOString(),
      },
      status: 'active',
    },
  });

  const onSubmit = async (data: Guarantee) => {
    try {
      const guaranteeData = {
        ...data,
        id: guarantee?.id || crypto.randomUUID(),
        createdAt: guarantee?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.put('guarantees', guaranteeData);
      toast.success(
        `Guarantee ${guarantee ? 'updated' : 'created'} successfully`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving guarantee:', error);
      toast.error(
        `Failed to ${guarantee ? 'update' : 'create'} guarantee`
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {guarantee ? 'Edit Guarantee' : 'New Guarantee'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guaranteeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guarantee ID</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guarantee Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="advance_payment">Advance Payment</SelectItem>
                        <SelectItem value="retention">Retention</SelectItem>
                        <SelectItem value="bid">Bid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuingBank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Bank</FormLabel>
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
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guarantee Value</FormLabel>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="released">Released</SelectItem>
                    </SelectContent>
                  </Select>
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
                {guarantee ? 'Update Guarantee' : 'Create Guarantee'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
