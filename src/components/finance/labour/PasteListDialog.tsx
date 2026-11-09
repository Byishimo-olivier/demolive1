import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { AlertTriangle, Camera, ClipboardPaste, ImageUp, ListChecks, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parsePastedList, type PastedLine } from '@/lib/paste-list';
import { readTextFromPhoto } from '@/lib/photo-text';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
  // Opened from "Import photo": lead with the photo buttons
  startWithPhoto?: boolean;
  onParsed: (lines: PastedLine[], date: string) => void;
}

const EXAMPLE = `1. Alice Uwase 0788 111 222
2. Jean Bosco 0788 000 002
3. Eric Nshuti 0722 333 444 A`;

/**
 * A list of people from a photo (read free, on this device) or from pasted / typed text.
 * The text is always shown and editable before the people are checked and recorded.
 */
export function PasteListDialog({ open, onOpenChange, defaultDate, startWithPhoto = false, onParsed }: Props) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [photo, setPhoto] = useState<string | null>(null);
  const [reading, setReading] = useState<{ progress: number; stage: string } | null>(null);
  // What the reader could not read: nothing at all, or a number of unclear lines left out
  const [notice, setNotice] = useState<null | { unreadable: true } | { unclear: number }>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (open) {
      setText('');
      setDate(defaultDate);
      setPhoto(null);
      setNotice(null);
    }
  }, [open, defaultDate]);

  // Release the photo preview when it changes or the window closes
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);

  const parsed = useMemo(() => parsePastedList(text), [text]);
  const withPhone = parsed.lines.filter((l) => l.phone).length;

  const readPhoto = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose a photo (JPG or PNG)');
      return;
    }
    setPhoto(URL.createObjectURL(file));
    setNotice(null);
    setReading({ progress: 0, stage: 'Preparing the photo…' });
    try {
      const found = await readTextFromPhoto(file, (progress, stage) => setReading({ progress, stage }));
      if (!found.text.trim()) {
        setNotice({ unreadable: true });
        return;
      }
      // A second photo (another page) adds to the list
      setText((current) => (current.trim() ? `${current.trim()}\n${found.text}` : found.text));
      if (found.unclearLines > 0) setNotice({ unclear: found.unclearLines });
      toast.success('Photo read. Check the names and numbers against the photo, then continue.', { duration: 6000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The photo could not be read', { duration: 8000 });
    } finally {
      setReading(null);
      if (cameraInput.current) cameraInput.current.value = '';
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const copied = await navigator.clipboard.readText();
      if (!copied.trim()) {
        toast.error('Nothing is copied yet. Copy the text first.');
        return;
      }
      setText(copied);
    } catch {
      // Some browsers only allow pasting with the keyboard or a long press
      toast('Press and hold in the box (or Ctrl+V) and choose Paste.', { duration: 5000 });
    }
  };

  const next = () => {
    if (parsed.lines.length === 0) {
      toast.error('No names found yet. Import a photo or paste the list first.');
      return;
    }
    // A date written on the list wins, unless it is in the future
    let day = date;
    if (parsed.date && parsed.date <= today && parsed.date !== date) {
      day = parsed.date;
      toast(`Date found on the list: ${format(parseISO(day), 'd MMM yyyy')}. Change it on the next screen if it is wrong.`, {
        duration: 7000,
      });
    }
    onParsed(parsed.lines, day);
    onOpenChange(false);
  };

  const photoButtons = (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={!!reading}
        onClick={() => cameraInput.current?.click()}
        className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-3 py-5 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-50"
      >
        <Camera className="h-6 w-6 text-gray-500" />
        Take a photo
      </button>
      <button
        type="button"
        disabled={!!reading}
        onClick={() => fileInput.current?.click()}
        className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-3 py-5 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-50"
      >
        <ImageUp className="h-6 w-6 text-gray-500" />
        {photo ? 'Add another page' : 'Choose a photo'}
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !reading && onOpenChange(o)}>
      <DialogContent className="max-h-[94vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {startWithPhoto ? 'Import a list from a photo' : 'Paste a list of people'}
          </DialogTitle>
          <DialogDescription>
            {startWithPhoto
              ? 'The photo is read on this device, free. Printed lists and clear CAPITAL letters read best. Check the text against the photo before continuing.'
              : 'Paste text copied from a photo (Google Lens / iPhone Live Text) or a message, or import a photo. Free, no setup.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="paste-date">Day of the list</Label>
            <Input id="paste-date" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-[170px]" />
          </div>

          {(startWithPhoto || photo) && photoButtons}
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => readPhoto(e.target.files?.[0])} />
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => readPhoto(e.target.files?.[0])} />

          {notice && !reading && (
            <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              {'unreadable' in notice ? (
                <div className="space-y-1">
                  <p className="font-medium">This writing could not be read reliably.</p>
                  <p>The free reader works on printed lists and clear CAPITAL letters, not joined-up handwriting. Two free ways to continue:</p>
                  <ul className="list-disc space-y-0.5 pl-5">
                    <li>
                      Copy the text with <span className="font-medium">Google Lens</span> (Android) or{' '}
                      <span className="font-medium">Live Text</span> (iPhone), which read handwriting much better, then press Paste.
                    </li>
                    <li>Or type the list in the box while looking at the photo: name, then phone, one person per line.</li>
                  </ul>
                </div>
              ) : (
                <p>
                  {notice.unclear} line(s) were too unclear to read and were left out. Compare with the photo and type any missing
                  people in the box.
                </p>
              )}
            </div>
          )}

          {reading && (
            <div className="space-y-1.5 rounded-lg border border-gray-200 p-3" aria-live="polite">
              <p className="flex items-center gap-2 text-sm text-gray-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                {reading.stage}
              </p>
              <Progress value={Math.round(reading.progress * 100)} className="h-1.5" />
            </div>
          )}

          <div className={photo ? 'grid gap-3 sm:grid-cols-2' : ''}>
            {photo && (
              <div className="relative">
                <a href={photo} target="_blank" rel="noopener" title="Open the photo full size">
                  <img src={photo} alt="Photo of the attendance list" className="h-[300px] w-full rounded-lg border border-gray-200 bg-gray-50 object-contain" />
                </a>
                {!reading && (
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-700 shadow hover:bg-white"
                    aria-label="Hide photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="paste-text">{photo ? 'Text from the photo (fix or type)' : 'The list'}</Label>
                <div className="flex gap-1.5">
                  {!startWithPhoto && !photo && (
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => fileInput.current?.click()} disabled={!!reading}>
                      <ImageUp className="mr-1.5 h-4 w-4" />
                      Photo
                    </Button>
                  )}
                  {/* Also next to a photo: text copied with Google Lens / Live Text */}
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={pasteFromClipboard} disabled={!!reading}>
                    <ClipboardPaste className="mr-1.5 h-4 w-4" />
                    Paste
                  </Button>
                </div>
              </div>
              <Textarea
                id="paste-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                // Next to a photo, an example list could be mistaken for what was read
                placeholder={photo ? 'Paste or type what the photo says, one person per line:\nName  phone number' : EXAMPLE}
                rows={photo ? 12 : 9}
                className="font-mono text-sm"
                disabled={!!reading}
              />
            </div>
          </div>

          <p className="text-sm text-gray-600" aria-live="polite">
            {text.trim() ? (
              <>
                <span className="font-semibold text-gray-900">{parsed.lines.length}</span> person(s) found
                {parsed.lines.length > 0 && <>, {withPhone} with a phone number</>}
                {parsed.date && <> · date on the list: {format(parseISO(parsed.date), 'd MMM yyyy')}</>}
              </>
            ) : (
              'One person per line works best: name, then phone. Marks at the end are understood: P present, A absent, H half day, L leave.'
            )}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!reading}>
            Cancel
          </Button>
          <Button onClick={next} disabled={parsed.lines.length === 0 || !!reading} className="bg-gray-900 text-white hover:bg-gray-800">
            <ListChecks className="mr-2 h-4 w-4" />
            Check {parsed.lines.length || ''} {parsed.lines.length === 1 ? 'person' : 'people'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
