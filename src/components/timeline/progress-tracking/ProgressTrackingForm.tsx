import { db } from '@/lib/db';
import type { ProgressReport } from '@/types/timeline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../ui/form';
import { Input } from '../../ui/input';
import { CorrectiveActionsSection } from './CorrectiveActionsSection';
import { DelaysSection } from './DelaysSection';
import { StageProgressSection } from './StageProgressSection';

// Schema definitions moved to a separate file for clarity
import { formSchema } from './schema';

type ProgressTrackingFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: ProgressReport | null;
  onSuccess: () => void;
};

export function ProgressTrackingForm({
  open,
  onOpenChange,
  progress,
  onSuccess,
}: ProgressTrackingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ProgressReport>({
    resolver: zodResolver(formSchema),
    defaultValues: progress || {
      projectId: '',
      reportingPeriod: {
        startDate: '',
        endDate: '',
      },
      stageProgress: [],
      delays: [],
      correctiveActions: [],
      overallProgress: 0,
    },
  });

  const onSubmit = async (data: ProgressReport) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const progressData = {
        ...data,
        id: progress?.id || crypto.randomUUID(),
        createdAt: progress?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.put('progress_reports', progressData);
      toast.success(
        `Progress report ${progress ? 'updated' : 'created'} successfully`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving progress report:', error);
      toast.error(
        `Failed to ${progress ? 'update' : 'create'} progress report`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateVariance = (index: number) => {
    const stageProgress = form.getValues(`stageProgress.${index}`);
    const variance = stageProgress.completion - stageProgress.plannedCompletion;
    form.setValue(`stageProgress.${index}.variance`, variance);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {progress ? 'Edit Progress Report' : 'New Progress Report'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reportingPeriod.startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reportingPeriod.endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <StageProgressSection
              control={form.control}
              calculateVariance={calculateVariance}
            />

            <DelaysSection control={form.control} />

            <CorrectiveActionsSection control={form.control} />

            <FormField
              control={form.control}
              name="overallProgress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Progress (%)</FormLabel>
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

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {progress ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  progress ? 'Update Report' : 'Create Report'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
