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
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/db';
import { getErrorMessage } from '@/utils/error-handler';
import type { RepairRecord, MaintenanceStatus, QualityCheckStatus } from '@/types/maintenance';

const formSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  assignedTeamId: z.string().min(1, 'Assigned team is required'),
  assignedTeamName: z.string().min(1, 'Team name is required'),
  statusUpdates: z.array(z.object({
    status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']),
    note: z.string().min(1, 'Status note is required'),
    timestamp: z.string(),
  })),
  materialsUsed: z.array(z.object({
    name: z.string().min(1, 'Material name is required'),
    quantity: z.number().min(0, 'Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    cost: z.number().min(0, 'Cost must be positive'),
  })),
  workHours: z.number().min(0, 'Work hours must be positive'),
  totalCost: z.number().min(0, 'Total cost must be positive'),
  completionNotes: z.string(),
  qualityCheckStatus: z.enum(['pending', 'passed', 'failed']),
  qualityCheckNotes: z.string().optional(),
});

type RepairTrackingFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair: RepairRecord | null;
  onSuccess: () => void;
};

export function RepairTrackingForm({
  open,
  onOpenChange,
  repair,
  onSuccess,
}: RepairTrackingFormProps) {
  const form = useForm<RepairRecord>({
    resolver: zodResolver(formSchema),
    defaultValues: repair || {
      requestId: '',
      assignedTeamId: '',
      assignedTeamName: '',
      statusUpdates: [],
      materialsUsed: [],
      workHours: 0,
      totalCost: 0,
      completionNotes: '',
      qualityCheckStatus: 'pending',
    },
  });

  const onSubmit = async (data: RepairRecord) => {
    try {
      const repairData = {
        ...data,
        id: repair?.id || crypto.randomUUID(),
        createdAt: repair?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.put('repair_records', repairData);
      toast.success(
        `Repair record ${repair ? 'updated' : 'created'} successfully`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving repair record:', error);
      toast.error(
        getErrorMessage(error, `Failed to ${repair ? 'update' : 'create'} repair record`)
      );
    }
  };

  const addMaterial = () => {
    const materials = form.getValues('materialsUsed');
    form.setValue('materialsUsed', [
      ...materials,
      { name: '', quantity: 0, unit: '', cost: 0 },
    ]);
  };

  const removeMaterial = (index: number) => {
    const materials = form.getValues('materialsUsed');
    form.setValue('materialsUsed', materials.filter((_, i) => i !== index));
  };

  const addStatusUpdate = () => {
    const updates = form.getValues('statusUpdates');
    form.setValue('statusUpdates', [
      ...updates,
      { status: 'in_progress', note: '', timestamp: new Date().toISOString() },
    ]);
  };

  const removeStatusUpdate = (index: number) => {
    const updates = form.getValues('statusUpdates');
    form.setValue('statusUpdates', updates.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {repair ? 'Edit Repair Record' : 'New Repair Record'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requestId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTeamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Team</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status Updates */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Status Updates</h3>
                <Button type="button" onClick={addStatusUpdate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Update
                </Button>
              </div>

              {form.watch('statusUpdates').map((_, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 items-end border p-4 rounded-lg">
                  <FormField
                    control={form.control}
                    name={`statusUpdates.${index}.status`}
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
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`statusUpdates.${index}.note`}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Note</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeStatusUpdate(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Materials Used */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Materials Used</h3>
                <Button type="button" onClick={addMaterial}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
              </div>

              {form.watch('materialsUsed').map((_, index) => (
                <div key={index} className="grid grid-cols-4 gap-4 items-end border p-4 rounded-lg">
                  <FormField
                    control={form.control}
                    name={`materialsUsed.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`materialsUsed.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
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
                    name={`materialsUsed.${index}.unit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`materialsUsed.${index}.cost`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Cost</FormLabel>
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
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeMaterial(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Hours</FormLabel>
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
                name="totalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Cost</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="completionNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="qualityCheckStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quality Check Status</FormLabel>
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="passed">Passed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qualityCheckNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quality Check Notes</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                {repair ? 'Update Record' : 'Create Record'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
