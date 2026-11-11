import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { Ban, Download, Loader2, LogOut, Printer, QrCode, ShieldCheck, Smartphone, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mobileApi, QR_VALID_DAYS, type MobileActivation } from '@/lib/mobile-api';
import { getErrorMessage } from '@/utils/error-handler';

const KEYS = { status: ['mobile-status'], qr: ['mobile-qr-codes'], devices: ['mobile-devices'] };

const validLabel = (days: number) => (days === 1 ? '1 day' : days === 365 ? '1 year' : `${days} days`);

/**
 * Company admins: QR codes that let employees' phones join the company in the mobile app,
 * and the phones signed in. Employees sign in with their usual account and permissions.
 */
export function MobileAppSettings() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: KEYS.status, queryFn: mobileApi.status });
  const qrCodes = useQuery({ queryKey: KEYS.qr, queryFn: mobileApi.listActivations, enabled: status.data?.configured === true });
  const devices = useQuery({ queryKey: KEYS.devices, queryFn: mobileApi.listDevices, enabled: status.data?.configured === true });
  const [created, setCreated] = useState<{ payload: string; label: string; expiresAt: string } | null>(null);

  if (status.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }
  if (status.isError) {
    return <p className="text-sm text-red-600">{getErrorMessage(status.error, 'Could not load the mobile app settings')}</p>;
  }
  const info = status.data!;

  if (!info.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile app
          </CardTitle>
          <CardDescription>Employees use the mobile app by scanning your company's QR code, then signing in with their usual account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-medium">Not set up for your company yet</p>
              <p>
                Your software provider first registers your company's server address for the app (a one-time, signed step).
                Once that is done, you can make QR codes here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: KEYS.qr });
    queryClient.invalidateQueries({ queryKey: KEYS.devices });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile app
          </CardTitle>
          <CardDescription>
            Make a QR code and give it to your employees. They install the app, scan it, and sign in with their usual
            email and password: they see what their role allows, as on the website. There is no public sign-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-1 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-gray-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Set up for {info.companyName}
            </p>
            <p className="text-gray-600">
              Server: <span className="font-mono text-gray-900">{info.apiUrl}</span>
            </p>
            <p className="text-gray-500">The QR code is signed, so the app cannot be sent to another server by a copied or altered code.</p>
          </div>
          <CreateQrForm
            onCreated={(result) => {
              setCreated(result);
              refresh();
            }}
          />
        </CardContent>
      </Card>

      <QrCodeList items={qrCodes.data ?? []} loading={qrCodes.isLoading} onChanged={refresh} />
      <DeviceList devices={devices.data ?? []} loading={devices.isLoading} onChanged={refresh} />

      {created && <QrDialog {...created} companyName={info.companyName} onClose={() => setCreated(null)} />}
    </div>
  );
}

function CreateQrForm({ onCreated }: { onCreated: (result: { payload: string; label: string; expiresAt: string }) => void }) {
  const [label, setLabel] = useState('');
  const [validDays, setValidDays] = useState('30');
  const create = useMutation({
    mutationFn: () => mobileApi.createActivation({ label: label.trim() || 'Company QR code', validDays: Number(validDays) }),
    onSuccess: (result) => {
      setLabel('');
      onCreated({ payload: result.qrPayload, label: result.activation.label, expiresAt: result.activation.expiresAt });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not make the QR code')),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="qr-label">Name of the QR code</Label>
        <Input id="qr-label" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Site staff, Kigali office" />
      </div>
      <div className="grid gap-1.5">
        <Label>Works for</Label>
        <Select value={validDays} onValueChange={setValidDays}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QR_VALID_DAYS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {validLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">After that, new phones cannot join with it. Phones already signed in stay signed in.</p>
      </div>
      <Button type="submit" disabled={create.isPending} className="bg-gray-900 text-white hover:bg-gray-800">
        {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
        Create QR code
      </Button>
    </form>
  );
}

/** The new QR code, shown once: download or print it now */
function QrDialog({ payload, label, expiresAt, companyName, onClose }: { payload: string; label: string; expiresAt: string; companyName: string; onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: 720 })
      .then(setImage)
      .catch(() => toast.error('Could not draw the QR code'));
  }, [payload]);

  const fileName = `${companyName}-${label}-mobile-app-qr.png`.replace(/[^\w.-]+/g, '-');
  const download = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = fileName;
    link.click();
  };

  const print = () => {
    if (!image) return;
    const win = window.open('', '_blank', 'width=700,height=900');
    if (!win) {
      toast.error('Allow pop-ups to print, or download the image instead');
      return;
    }
    const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    win.document.write(`<!doctype html><html><head><title>${escape(companyName)} mobile app</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#111}img{width:360px;height:360px}
      h1{font-size:24px;margin:0 0 4px}p{color:#444;margin:6px 0}</style></head><body>
      <h1>${escape(companyName)}</h1><p>Scan with the mobile app to join</p>
      <img src="${image}" alt="QR code" onload="window.print()" />
      <p><strong>${escape(label)}</strong></p><p>Valid until ${escape(format(new Date(expiresAt), 'd MMMM yyyy'))}</p>
      <p style="font-size:12px;color:#777">Then sign in with your usual email and password. Keep this code within the company.</p>
      </body></html>`);
    win.document.close();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>QR code: {label}</DialogTitle>
          <DialogDescription>
            Download or print it now: for security it is shown only once. If it gets lost, make a new one and revoke this one.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2">
          {image ? (
            <img src={image} alt={`QR code for ${companyName} mobile app`} className="h-64 w-64 rounded-lg border border-gray-200" />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
          <p className="text-sm text-gray-600">Valid until {format(new Date(expiresAt), 'd MMM yyyy')}</p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={download} disabled={!image}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" onClick={print} disabled={!image}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={onClose} className="bg-gray-900 text-white hover:bg-gray-800">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_STYLE: Record<MobileActivation['status'], string> = {
  active: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-gray-100 text-gray-700',
  revoked: 'bg-red-100 text-red-800',
};

function QrCodeList({ items, loading, onChanged }: { items: MobileActivation[]; loading: boolean; onChanged: () => void }) {
  const revoke = useMutation({
    mutationFn: mobileApi.revokeActivation,
    onSuccess: () => {
      toast.success('QR code revoked: no new phones can join with it');
      onChanged();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not revoke the QR code')),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">QR codes</CardTitle>
        <CardDescription>Revoke a code that was shared too widely. Phones already signed in are not affected; sign them out below.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No QR codes yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((qr) => (
              <li key={qr._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-gray-900">
                    {qr.label}
                    <Badge variant="secondary" className={STATUS_STYLE[qr.status]}>
                      {qr.status === 'active' ? 'Active' : qr.status === 'expired' ? 'Expired' : 'Revoked'}
                    </Badge>
                  </p>
                  <p className="text-xs text-gray-500">
                    {qr.status === 'active' ? `Works until ${format(new Date(qr.expiresAt), 'd MMM yyyy')}` : qr.status === 'expired' ? `Expired ${format(new Date(qr.expiresAt), 'd MMM yyyy')}` : `Revoked ${format(new Date(qr.revokedAt!), 'd MMM yyyy')}`}
                    {' · '}
                    used {qr.uses} time{qr.uses === 1 ? '' : 's'}
                    {qr.lastUsedAt && `, last ${formatDistanceToNow(new Date(qr.lastUsedAt), { addSuffix: true })}`}
                    {qr.createdByName && ` · made by ${qr.createdByName}`}
                  </p>
                </div>
                {qr.status === 'active' && (
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={revoke.isPending} onClick={() => revoke.mutate(qr._id)}>
                    <Ban className="mr-1.5 h-4 w-4" />
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DeviceList({ devices, loading, onChanged }: { devices: { _id: string; user: { fullName: string; email: string } | null; deviceName: string | null; platform: string | null; lastUsedAt: string; createdAt: string }[]; loading: boolean; onChanged: () => void }) {
  const signOut = useMutation({
    mutationFn: mobileApi.signOutDevice,
    onSuccess: () => {
      toast.success('Phone signed out');
      onChanged();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not sign the phone out')),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Signed-in phones</CardTitle>
        <CardDescription>Sign out a lost or replaced phone: it loses access at once.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
        ) : devices.length === 0 ? (
          <p className="text-sm text-gray-500">No phones are signed in.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {devices.map((d) => (
              <li key={d._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{d.user?.fullName ?? 'Unknown user'}</p>
                  <p className="text-xs text-gray-500">
                    {[d.deviceName, d.platform].filter(Boolean).join(' · ') || 'Phone'} · active {formatDistanceToNow(new Date(d.lastUsedAt), { addSuffix: true })}
                    {d.user?.email && ` · ${d.user.email}`}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={signOut.isPending} onClick={() => signOut.mutate(d._id)}>
                  <LogOut className="mr-1.5 h-4 w-4" />
                  Sign out
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
