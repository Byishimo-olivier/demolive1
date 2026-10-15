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

type DelaysSectionProps = {
  control: Control<ProgressReport>;
};

export function DelaysSection({ control }: DelaysSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'delays',
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Delays</h3>
        <Button
          type="button"
          onClick={() =>
            append({
              stage: 'preliminaries',
              reason: '',
              impact: '',
              documents: [],
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Delay
        </Button>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="grid grid-cols-4 gap-4 items-end border p-4 rounded-lg"
        >
          <FormField
            control={control}
            name={`delays.${index}.stage`}
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
            name={`delays.${index}.reason`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`delays.${index}.impact`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Impact</FormLabel>
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
