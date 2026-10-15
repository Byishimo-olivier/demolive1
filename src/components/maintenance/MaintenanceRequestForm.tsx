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
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import { db } from '@/lib/db';
import { getErrorMessage } from '@/utils/error-handler';
import type { MaintenanceRequest, MaintenanceCategory, MaintenancePriority } from '@/types/maintenance';

const formSchema = z.object({
  requesterName: z.string().min(1, 'Requester name is required'),
  department: z.string().min(1, 'Department is required'),
  description: z.string().min(10, 'Please provide a detailed description'),
  priority: z.enum(['low', 'medium', 'high', 'emergency'] as const),
  location: z.string().min(1, 'Location is required'),
  category: z.enum(['IT', 'Plumbing', 'Electrical', 'Civil'] as const),
  attachments: z.array(z.string()),
  preferredStartDate: z.string().min(1, 'Start date is required'),
  preferredEndDate: z.string().min(1, 'End date is required'),
});

type MaintenanceRequestFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest | null;
  onSuccess: () => void;
};

export function MaintenanceRequestForm({
  open,
  onOpenChange,
  request,
  onSuccess,
}: MaintenanceRequestFormProps) {
  const form = useForm<MaintenanceRequest>({
    resolver: zodResolver(formSchema),
    defaultValues: request || {
      requesterName: '',
      department: '',
      description: '',
      priority: 'medium',
      location: '',
      category: 'Civil',
      attachments: [],
      preferredStartDate: '',
      preferredEndDate: '',
      status: 'pending',
    },
  });

  const onSubmit = async (data: MaintenanceRequest) => {
    try {
      const requestData = {
        ...data,
        id: request?.id || crypto.randomUUID(),
        status: request?.status || 'pending',
        createdAt: request?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.put('maintenance_requests', requestData);
      toast.success(
        `Maintenance request ${request ? 'updated' : 'created'} successfully`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving maintenance request:', error);
      toast.error(getErrorMessage(error, `Failed to ${request ? 'update' : 'create'} maintenance request`));  
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {request ? 'Edit Maintenance Request' : 'New Maintenance Request'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requesterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requester Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Please describe the issue in detail..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="Plumbing">Plumbing</SelectItem>
                        <SelectItem value="Electrical">Electrical</SelectItem>
                        <SelectItem value="Civil">Civil</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
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
                name="preferredStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {request ? 'Update Request' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
