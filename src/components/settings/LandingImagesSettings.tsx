import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, ExternalLink, ImagePlus, Loader2, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageCarousel3D } from '@/components/landing/3d/ImageCarousel3D';
import { DEFAULT_LANDING_GALLERY, landingGallery } from '@/components/landing/3d/gallery';
import {
  LANDING_IMAGE_LIMIT,
  LANDING_IMAGE_MAX_BYTES,
  LANDING_IMAGE_TYPES,
  LANDING_LABEL_MAX,
  siteApi,
  type LandingImage,
} from '@/lib/site-api';
import { getErrorMessage } from '@/utils/error-handler';
import { LANDING_SECTIONS, uploadedFor, type LandingSectionKey, type LandingSlot } from '@/lib/landing-sections';

const QUERY_KEY = ['landing-images'];

function checkFile(file: File): string | null {
  if (!LANDING_IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP image';
  if (file.size > LANDING_IMAGE_MAX_BYTES) return 'The image must be 5MB or smaller';
  return null;
}

const NO_IMAGES: LandingImage[] = [];

/** The home page's photos: the 3D gallery, and the photos of its other sections. */
export function LandingImagesSettings() {
  const queryClient = useQueryClient();
  const { data: all = NO_IMAGES, isLoading } = useQuery({ queryKey: QUERY_KEY, queryFn: siteApi.listLandingImages });
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const images = all.filter((image) => image.section === 'gallery');

  const full = images.length >= LANDING_IMAGE_LIMIT;

  const reorder = useMutation({
    mutationFn: siteApi.reorderLandingImages,
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<LandingImage[]>(QUERY_KEY);
      if (previous) {
        const byId = new Map(previous.map((i) => [i._id, i]));
        // Only the gallery is reordered; other sections' photos stay as they are
        queryClient.setQueryData(QUERY_KEY, [
          ...ids.map((id, order) => ({ ...byId.get(id)!, order })),
          ...previous.filter((i) => i.section !== 'gallery'),
        ]);
      }
      return { previous };
    },
    onError: (error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      toast.error(getErrorMessage(error, 'Could not change the order'));
    },
    onSettled: refresh,
  });

  const move = (index: number, by: -1 | 1) => {
    const ids = images.map((i) => i._id);
    const target = index + by;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Landing page gallery</CardTitle>
            <CardDescription className="mt-1.5 max-w-2xl">
              These photos spin in the 3D gallery on the public home page, in the order shown below. You can add up to{' '}
              {LANDING_IMAGE_LIMIT}. With fewer than 6, built-in photos fill the rest of the ring; with none, only the
              built-in photos are shown.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/" target="_blank" rel="noopener">
              View home page
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <UploadForm disabled={full} onAdded={refresh} />
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Live 3D preview</p>
            <ImageCarousel3D items={landingGallery(images)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Your photos{' '}
            <span className="text-sm font-normal text-gray-500">
              {images.length} / {LANDING_IMAGE_LIMIT}
            </span>
          </CardTitle>
          <CardDescription>Use the arrows to change the order. Click a caption to edit it.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <ImagePlus className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-600">No photos uploaded yet.</p>
              <p className="mt-1 text-xs text-gray-500">
                The home page is showing the {DEFAULT_LANDING_GALLERY.length} built-in business photos.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {images.map((image, index) => (
                <ImageTile
                  key={image._id}
                  image={image}
                  position={index + 1}
                  isFirst={index === 0}
                  isLast={index === images.length - 1}
                  busy={reorder.isPending}
                  onMove={(by) => move(index, by)}
                  onChanged={refresh}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SectionPhotos images={all} loading={isLoading} onChanged={refresh} />
    </div>
  );
}

/** One photo per place in the other sections; each falls back to its built-in photo */
function SectionPhotos({ images, loading, onChanged }: { images: LandingImage[]; loading: boolean; onChanged: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Other sections of the home page</CardTitle>
        <CardDescription>
          Replace any photo below with your own. Use default puts the built-in photo back.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          LANDING_SECTIONS.map((section) => (
            <section key={section.section} aria-labelledby={`landing-${section.section}`}>
              <h3 id={`landing-${section.section}`} className="font-heading text-base font-semibold text-gray-900">
                {section.title}
              </h3>
              <p className="mb-3 text-sm text-gray-500">{section.description}</p>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {section.slots.map((slot) => (
                  <SlotTile
                    key={slot.slot}
                    section={section.section}
                    slot={slot}
                    uploaded={uploadedFor(images, section.section, slot.slot)}
                    onChanged={onChanged}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SlotTile({
  section,
  slot,
  uploaded,
  onChanged,
}: {
  section: LandingSectionKey;
  slot: LandingSlot;
  uploaded?: LandingImage;
  onChanged: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  const replace = useMutation({
    mutationFn: (image: File) => siteApi.addLandingImage({ image, section, slot: slot.slot, label: slot.label }),
    onSuccess: () => {
      toast.success(`${slot.label}: photo replaced`);
      onChanged();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not upload the photo')),
  });

  const reset = useMutation({
    mutationFn: () => siteApi.removeLandingImage(uploaded!._id),
    onSuccess: () => {
      toast.success(`${slot.label}: back to the default photo`);
      onChanged();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not reset the photo')),
  });

  const choose = (file?: File | null) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    const problem = checkFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    replace.mutate(file);
  };

  const busy = replace.isPending || reset.isPending;
  const shapeHint = slot.shape === 'tall' ? 'Portrait photo works best' : 'Landscape photo works best';

  return (
    <li className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className={`relative bg-gray-100 ${slot.shape === 'tall' ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
        <img
          src={uploaded?.url ?? slot.fallback}
          alt={uploaded?.alt || slot.fallbackAlt || slot.label}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
            uploaded ? 'bg-emerald-600 text-white' : 'bg-white/90 text-gray-700'
          }`}
        >
          {uploaded ? 'Your photo' : 'Default'}
        </span>
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{slot.label}</p>
          <p className="text-xs text-gray-500">{shapeHint}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => input.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Replace
          </Button>
          {uploaded && (
            <Button size="sm" variant="ghost" className="h-8 text-gray-600" disabled={busy} onClick={() => reset.mutate()}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Use default
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={LANDING_IMAGE_TYPES.join(',')}
          className="hidden"
          aria-label={`Replace the ${slot.label} photo`}
          onChange={(e: ChangeEvent<HTMLInputElement>) => choose(e.target.files?.[0])}
        />
      </div>
    </li>
  );
}

function UploadForm({ disabled, onAdded }: { disabled: boolean; onAdded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [alt, setAlt] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (picked?: File | null) => {
    if (!picked) return;
    const problem = checkFile(picked);
    if (problem) {
      toast.error(problem);
      return;
    }
    setFile(picked);
    // Suggest a caption from the file name
    if (!label) {
      const base = picked.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      setLabel(base.charAt(0).toUpperCase() + base.slice(1, LANDING_LABEL_MAX));
    }
  };

  const reset = () => {
    setFile(null);
    setLabel('');
    setAlt('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const add = useMutation({
    mutationFn: siteApi.addLandingImage,
    onSuccess: () => {
      toast.success('Photo added to the home page');
      reset();
      onAdded();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not upload the photo')),
  });

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) choose(e.dataTransfer.files?.[0]);
  };

  const submit = () => {
    if (!file) return toast.error('Choose a photo first');
    if (!label.trim()) return toast.error('Add a caption');
    add.mutate({ image: file, label: label.trim(), alt: alt.trim() || undefined });
  };

  if (disabled) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 p-8 text-center">
        <ImagePlus className="mb-3 h-10 w-10 text-gray-300" />
        <p className="font-medium text-gray-700">The gallery is full</p>
        <p className="mt-1 text-sm text-gray-500">Remove a photo to add another one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
          dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Selected photo" className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-gray-700 shadow hover:bg-white"
              aria-label="Remove selected photo"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Upload className="mb-3 h-8 w-8 text-gray-400" />
            <p className="font-medium text-gray-700">Drop a photo here, or click to choose</p>
            <p className="mt-1 text-xs text-gray-500">JPG, PNG or WebP · up to 5MB · landscape or portrait both work</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={LANDING_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => choose(e.target.files?.[0])}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="landing-label">Caption</Label>
        <Input
          id="landing-label"
          value={label}
          maxLength={LANDING_LABEL_MAX}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Kigali office tower"
        />
        <p className="text-xs text-gray-500">Shown on the photo. {LANDING_LABEL_MAX - label.length} characters left.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="landing-alt">
          Description <span className="font-normal text-gray-500">(optional)</span>
        </Label>
        <Input
          id="landing-alt"
          value={alt}
          maxLength={160}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="What the photo shows, for screen readers"
        />
      </div>
      <Button onClick={submit} disabled={add.isPending || !file} className="w-full bg-gray-900 text-white hover:bg-gray-800">
        {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
        Add to home page
      </Button>
    </div>
  );
}

function ImageTile({
  image,
  position,
  isFirst,
  isLast,
  busy,
  onMove,
  onChanged,
}: {
  image: LandingImage;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMove: (by: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [label, setLabel] = useState(image.label);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setLabel(image.label), [image.label]);

  const rename = useMutation({
    mutationFn: (next: string) => siteApi.updateLandingImage(image._id, { label: next }),
    onSuccess: () => {
      toast.success('Caption saved');
      onChanged();
    },
    onError: (error) => {
      setLabel(image.label);
      toast.error(getErrorMessage(error, 'Could not save the caption'));
    },
  });

  const remove = useMutation({
    mutationFn: () => siteApi.removeLandingImage(image._id),
    onSuccess: () => {
      toast.success('Photo removed');
      onChanged();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not remove the photo')),
  });

  const saveLabel = () => {
    const next = label.trim();
    if (!next) {
      setLabel(image.label);
      return;
    }
    if (next !== image.label) rename.mutate(next);
  };

  return (
    <li className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="relative aspect-[4/3] bg-gray-100">
        <img src={image.url} alt={image.alt || image.label} loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-white">
          {position}
        </span>
      </div>
      <div className="space-y-3 p-3">
        <Input
          value={label}
          maxLength={LANDING_LABEL_MAX}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          disabled={rename.isPending}
          aria-label={`Caption for photo ${position}`}
          className="h-9"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={isFirst || busy}
              onClick={() => onMove(-1)}
              aria-label="Move earlier"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={isLast || busy}
              onClick={() => onMove(1)}
              aria-label="Move later"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {confirming ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setConfirming(false)}>
                Keep
              </Button>
              <Button
                size="sm"
                className="h-8 bg-red-600 text-white hover:bg-red-700"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                {remove.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Remove
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
