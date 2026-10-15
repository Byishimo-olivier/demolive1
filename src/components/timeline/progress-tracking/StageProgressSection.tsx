import React from 'react';
import { useFieldArray, Control } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { ProgressReport } from '@/types/timeline';

type StageProgressSectionProps = {
  control: Control<ProgressReport>;
  calculateVariance: (index: number) => void;
};

export function StageProgressSection({ control, calculateVariance }: StageProgressSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stageProgress',
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Stage Progress</h3>
        <Button
          type="button"
          onClick={() =>
            append({
              stage: 'preliminaries',
              completion: 0,
              plannedCompletion: 0,
              variance: 0,
              comments: '',
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Stage Progress
        </Button>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="grid grid-cols-6 gap-4 items-end border p-4 rounded-lg"
        >
          <FormField
            control={control}
            name={`stageProgress.${index}.stage`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stage</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="preliminaries">Preliminaries</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="procurement">Procurement</SelectItem>
                    <SelectItem value="mobilization">Mobilization</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="testing">Testing & Commissioning</SelectItem>
                    <SelectItem value="handover">Handover</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`stageProgress.${index}.completion`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actual Progress (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      field.onChange(Number(e.target.value));
                      calculateVariance(index);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`stageProgress.${index}.plannedCompletion`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Planned Progress (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      field.onChange(Number(e.target.value));
                      calculateVariance(index);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`stageProgress.${index}.variance`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variance (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    readOnly
                    className="bg-gray-50"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`stageProgress.${index}.comments`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comments</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
