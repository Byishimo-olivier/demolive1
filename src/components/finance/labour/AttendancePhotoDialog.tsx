import { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { AlertTriangle, Camera, CheckCircle2, ImageUp, Loader2, RefreshCw, SwitchCamera, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { labourApi, type AttendancePhoto, type AttendancePhotoResult, type Worker } from '@/lib/labour-api';
import { apiFileUrl } from '@/lib/axios';
import { loadFaceModels, readFace, type FaceRead } from '@/lib/face';
import { getErrorMessage } from '@/utils/error-handler';
import { cn } from '@/lib/utils';

export type PhotoKind = 'in' | 'out';
// Arrival / leaving photos are saved here; a profile photo is handed back to the worker form
export type PhotoTarget = { worker: Worker; kind: PhotoKind } | { worker: Pick<Worker, 'fullName'>; kind: 'profile' };

// Photos are scaled down before reading the face and sending: enough detail, small upload
const MAX_SIDE = 960;

const toCanvas = (source: CanvasImageSource, width: number, height: number) => {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const timeOf = (photo?: AttendancePhoto) => (photo ? format(parseISO(photo.at), 'HH:mm') : '');

/** Arrival and leaving photos side by side, with the face comparison */
export function PhotoCompare({ checkIn, checkOut }: { checkIn?: AttendancePhoto; checkOut?: AttendancePhoto }) {
  const compared = checkIn && checkOut && checkOut.match !== undefined;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {([
          ['Arrived', checkIn],
          ['Left', checkOut],
        ] as const).map(([label, photo]) => (
          <figure key={label} className="space-y-1">
            {photo ? (
              <a href={apiFileUrl(photo.photoPath)} target="_blank" rel="noreferrer">
                <img
                  src={apiFileUrl(photo.photoPath)}
                  alt={`${label} photo`}
                  className="aspect-[3/4] w-full rounded-lg border border-gray-200 bg-gray-100 object-cover"
                />
              </a>
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                No photo yet
              </div>
            )}
            <figcaption className="text-xs text-gray-600">
              <span className="font-medium text-gray-900">{label}</span>
              {photo && ` ${timeOf(photo)}`}
              {photo?.byName && ` · by ${photo.byName}`}
            </figcaption>
          </figure>
        ))}
      </div>
      {compared &&
        (checkOut.match ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Same person as this morning
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">Does not look like the same person.</span> Check who really worked today. If it is the
              same worker (bad light, turned face), retake the leaving photo.
            </span>
          </p>
        ))}
    </div>
  );
}

interface Props {
  projectId: string;
  date: string;
  target: PhotoTarget | null;
  // The worker's photos so far today (the arrival photo is shown when taking the leaving one)
  current?: { checkIn?: AttendancePhoto; checkOut?: AttendancePhoto };
  onClose: () => void;
  onSaved?: (result: AttendancePhotoResult) => void;
  // Profile photo: the photo and its face, for the worker form to save
  onCaptured?: (photo: string, descriptor: number[]) => void;
}

type Step = 'camera' | 'checking' | 'preview' | 'saving' | 'done';

export function AttendancePhotoDialog({ projectId, date, target, current, onClose, onSaved, onCaptured }: Props) {
  const open = !!target;
  const [step, setStep] = useState<Step>('camera');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [face, setFace] = useState<FaceRead | null>(null);
  const [result, setResult] = useState<AttendancePhotoResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Start loading the face models as soon as the dialog opens
  useEffect(() => {
    if (open) loadFaceModels().catch(() => undefined);
  }, [open]);

  // A fresh start for each worker
  useEffect(() => {
    setStep('camera');
    setPhoto(null);
    setFace(null);
    setResult(null);
  }, [target]);

  // Live camera while on the camera step; stopped as soon as the photo is taken or the dialog closes
  useEffect(() => {
    if (!open || step !== 'camera') return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    setCameraError(null);
    setCameraReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser cannot open the camera on this page (it needs https). Use "Use phone camera" below.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          video.play().catch(() => undefined);
        }
      })
      .catch((error: { name?: string }) => {
        if (cancelled) return;
        setCameraError(
          error?.name === 'NotAllowedError'
            ? 'Camera access was refused. Allow the camera for this site, or use "Use phone camera" below.'
            : 'The camera could not be opened. Use "Use phone camera" below.'
        );
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, step, facing]);

  const check = async (canvas: HTMLCanvasElement) => {
    setPhoto(canvas.toDataURL('image/jpeg', 0.85));
    setFace(null);
    setStep('checking');
    try {
      setFace(await readFace(canvas));
    } catch {
      setFace({ ok: false, reason: 'Face reading could not start (the face models did not load). Check the connection and try again.' });
    }
    setStep('preview');
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    void check(toCanvas(video, video.videoWidth, video.videoHeight));
  };

  const fromFile = async (file?: File) => {
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      void check(toCanvas(bitmap, bitmap.width, bitmap.height));
    } catch {
      toast.error('This photo could not be opened. Use a JPG or PNG photo.');
    }
  };

  const save = async () => {
    if (!target || !photo || !face?.ok) return;
    if (target.kind === 'profile') {
      onCaptured?.(photo, face.descriptor);
      onClose();
      return;
    }
    setStep('saving');
    try {
      const res = await labourApi.recordPhoto({
        projectId,
        workerId: target.worker._id,
        date,
        kind: target.kind,
        photo,
        descriptor: face.descriptor,
      });
      onSaved?.(res.data);
      if (target.kind === 'in') {
        toast.success(res.message);
        onClose();
      } else {
        setResult(res.data);
        setStep('done');
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Could not save the photo');
      // Not this worker's face (profile photo, or another worker who already arrived): show it on the photo, a retake is needed
      if ((error as { response?: { status?: number } })?.response?.status === 409) {
        setFace({ ok: false, reason: message });
      } else {
        toast.error(message);
      }
      setStep('preview');
    }
  };

  const retake = () => {
    setPhoto(null);
    setFace(null);
    setStep('camera');
  };

  const leaving = target?.kind === 'out';
  const profile = target?.kind === 'profile';
  const name = target?.worker.fullName ?? '';
  const registered = target && target.kind !== 'profile' ? target.worker.profilePhoto : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && step !== 'saving' && onClose()}>
      <DialogContent className="max-h-[95vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {profile
              ? name
                ? `Profile photo of ${name}`
                : 'Profile photo'
              : step === 'done'
                ? `${name}: morning and evening`
                : leaving
                  ? `${name} is leaving`
                  : `${name} is arriving`}
          </DialogTitle>
          <DialogDescription>
            {profile
              ? 'A clear photo of the worker’s face, looking at the camera. Arrival and leaving photos must match it, so nobody else can be recorded as this worker.'
              : step === 'done'
              ? 'The leaving photo was compared with the arrival photo.'
              : leaving
                ? 'Take a photo of the worker’s face. It is compared with this morning’s photo to check it is the same person.'
                : 'Take a photo of the worker’s face. The worker is marked present; the photo is compared with the leaving photo this evening.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'done' && result ? (
          <PhotoCompare checkIn={result.checkIn} checkOut={result.checkOut} />
        ) : (
          <div className="space-y-3">
            {!profile && step === 'camera' &&
              (registered ? (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <img
                    src={apiFileUrl(registered.photoPath)}
                    alt={`Profile photo of ${name}`}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                  <p className="text-xs text-gray-600">
                    Compared with <span className="font-medium text-gray-900">{name}</span>’s profile photo: another person’s
                    face is refused.
                  </p>
                </div>
              ) : (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <UserRound className="mt-0.5 h-4 w-4 shrink-0" />
                  {name} has no profile photo, so the face cannot be checked against the registered worker. Add one under
                  Workers.
                </p>
              ))}
            {leaving && current?.checkIn && step === 'camera' && (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
                <img
                  src={apiFileUrl(current.checkIn.photoPath)}
                  alt="Arrival photo"
                  className="h-14 w-14 rounded-md object-cover"
                />
                <p className="text-xs text-gray-600">
                  Arrived at <span className="font-medium text-gray-900">{timeOf(current.checkIn)}</span>. Make sure the same
                  worker is in front of the camera.
                </p>
              </div>
            )}

            {step === 'camera' ? (
              cameraError ? (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
                  <Camera className="h-8 w-8 text-gray-300" />
                  {cameraError}
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl bg-black">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    onLoadedData={() => setCameraReady(true)}
                    className={cn('aspect-[4/3] w-full object-cover', facing === 'user' && '-scale-x-100')}
                  />
                  {/* Where to put the face */}
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[45%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/70" />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="relative overflow-hidden rounded-xl bg-black">
                {photo && <img src={photo} alt="Photo taken" className="aspect-[4/3] w-full object-contain" />}
                {step === 'checking' && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-sm text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Looking for the face…
                  </div>
                )}
              </div>
            )}

            {step === 'preview' && face && (
              face.ok ? (
                <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Face found. {profile ? 'Use the photo' : 'Save the photo'}, or retake it.
                </p>
              ) : (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {face.reason}
                </p>
              )
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void fromFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          {step === 'camera' && (
            <>
              <div className="flex gap-2">
                {!cameraError && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                    title="Switch between the front and back camera"
                  >
                    <SwitchCamera className="mr-1.5 h-4 w-4" />
                    Switch
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImageUp className="mr-1.5 h-4 w-4" />
                  Use phone camera
                </Button>
              </div>
              <Button onClick={capture} disabled={!!cameraError || !cameraReady} className="bg-gray-900 text-white hover:bg-gray-800">
                <Camera className="mr-2 h-4 w-4" />
                Take photo
              </Button>
            </>
          )}
          {(step === 'preview' || step === 'checking' || step === 'saving') && (
            <>
              <Button variant="outline" onClick={retake} disabled={step !== 'preview'}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button
                onClick={save}
                disabled={step !== 'preview' || !face?.ok}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                {step === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {profile ? 'Use this photo' : leaving ? 'Save and compare' : 'Save arrival'}
              </Button>
            </>
          )}
          {step === 'done' && (
            <>
              {!result?.checkOut?.match && (
                <Button variant="outline" onClick={retake}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retake leaving photo
                </Button>
              )}
              <Button onClick={onClose} className="bg-gray-900 text-white hover:bg-gray-800">
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Both photos of a worker's day, opened from the register */
export function AttendancePhotosView({
  title,
  photos,
  onClose,
  onRetake,
}: {
  title: string;
  photos: { checkIn?: AttendancePhoto; checkOut?: AttendancePhoto } | null;
  onClose: () => void;
  // Today's unpaid lines only: retake one of the photos
  onRetake?: (kind: PhotoKind) => void;
}) {
  return (
    <Dialog open={!!photos} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Arrival and leaving photos. Click a photo to open it full size.</DialogDescription>
        </DialogHeader>
        {photos && <PhotoCompare checkIn={photos.checkIn} checkOut={photos.checkOut} />}
        {onRetake && photos?.checkIn && (
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => onRetake('in')}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Retake arrival
            </Button>
            <Button variant="outline" size="sm" onClick={() => onRetake('out')}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {photos.checkOut ? 'Retake leaving' : 'Take leaving photo'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
