import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createDeleteRequest,
  DeleteRequestStatus,
  getDeleteRequest,
} from '@/src/api/endpoints/delete-requests.api';
import { BrandLogo } from '@/src/components/layout';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

function StatusView({ id }: { id: string }) {
  const [request, setRequest] = useState<DeleteRequestStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDeleteRequest(id)
      .then((data) => { if (active) setRequest(data); })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  return (
    <CardContent className="space-y-4 p-6">
      {loading && (
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      )}
      {!loading && error && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-600">{error}</p>
      )}
      {!loading && request && (
        <div className="space-y-3 rounded-xl bg-zinc-50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-500">Status</span>
            <Badge className={STATUS_STYLES[request.status] ?? 'bg-zinc-100 text-zinc-700'}>
              {request.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-500">Account</span>
            <span className="font-semibold text-zinc-900">{request.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-500">Submitted</span>
            <span className="text-zinc-900">{new Date(request.createdAt).toLocaleString()}</span>
          </div>
          <div className="break-all border-t border-zinc-200 pt-3 text-xs text-zinc-400">
            Request ID: {request.id}
          </div>
        </div>
      )}
      <Link to="/delete-request" >
        Submit a new request
      </Link>
    </CardContent>
  );
}

function RequestForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await createDeleteRequest({ email, name, reason });
      navigate(`/delete-request/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit the request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CardContent className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="delete-email">Account email *</Label>
          <Input
            id="delete-email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="delete-name">Full name</Label>
          <Input
            id="delete-name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="delete-reason">Reason (optional)</Label>
          <Textarea
            id="delete-reason"
            placeholder="Tell us why you want your account deleted"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-600">{error}</p>
        )}
        <Button type="submit" disabled={submitting} className=" mx-auto">
          {submitting ? 'Submitting…' : 'Request Account Deletion'}
        </Button>
        <p className="text-center text-xs text-zinc-400">
          An administrator will review your request. This action cannot be undone once approved.
        </p>
      </form>
    </CardContent>
  );
}

export function DeleteAccountRequestPage() {
  const { id } = useParams();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md overflow-hidden rounded-[2rem] border-zinc-200 shadow-2xl">
        <CardHeader className="space-y-6 bg-white pb-8 pt-10 text-center">
          <BrandLogo className="mx-auto w-32 md:w-48" />
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight text-zinc-900">
              {id ? 'Deletion Request Status' : 'Delete My Account'}
            </CardTitle>
            <CardDescription className="font-medium text-zinc-500">
              {id
                ? 'Track the progress of your account deletion request.'
                : 'Request permanent deletion of your account. An admin will review and process it.'}
            </CardDescription>
          </div>
        </CardHeader>
        {id ? <StatusView id={id} /> : <RequestForm />}
      </Card>
    </div>
  );
}
