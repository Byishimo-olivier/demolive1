import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { humanizeLabel } from '@/lib/utils';
import { OTHER_PERSON, type TeamOption } from './timeline-utils';

const UNASSIGNED = '__none__';

interface ResponsiblePersonFieldProps {
  teamOptions: TeamOption[];
  // Selected team member id, OTHER_PERSON for a free-text name, or '' when unassigned
  value: string;
  otherName: string;
  onChange: (value: string, otherName: string) => void;
  disabled?: boolean;
}

/**
 * Pick the responsible person from the project team, or type the name of
 * someone who is not a system user (e.g. a subcontractor or foreman).
 */
export function ResponsiblePersonField({ teamOptions, value, otherName, onChange, disabled }: ResponsiblePersonFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="responsiblePerson">Responsible Person</Label>
      <Select
        value={value || UNASSIGNED}
        disabled={disabled}
        onValueChange={(v) => onChange(v === UNASSIGNED ? '' : v, v === OTHER_PERSON ? otherName : '')}
      >
        <SelectTrigger id="responsiblePerson">
          <SelectValue placeholder="Select responsible person" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Not assigned</SelectItem>
          {teamOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
              {option.role ? ` (${humanizeLabel(option.role)})` : ''}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_PERSON}>Other (type a name)</SelectItem>
        </SelectContent>
      </Select>
      {value === OTHER_PERSON && (
        <Input
          value={otherName}
          disabled={disabled}
          onChange={(e) => onChange(OTHER_PERSON, e.target.value)}
          placeholder="Name of the responsible person"
          maxLength={200}
        />
      )}
    </div>
  );
}

// Convert the field state to the API payload
export const responsiblePersonPayload = (value: string, otherName: string) =>
  value === OTHER_PERSON
    ? { responsiblePerson: '', responsiblePersonName: otherName.trim() }
    : { responsiblePerson: value, responsiblePersonName: '' };

// Convert a stored responsible person back to the field state
export const responsiblePersonState = (
  ref: { _id?: string } | string | null | undefined,
  name?: string
): { value: string; otherName: string } => {
  const id = typeof ref === 'string' ? ref : ref?._id;
  if (id) return { value: id, otherName: '' };
  if (name) return { value: OTHER_PERSON, otherName: name };
  return { value: '', otherName: '' };
};
