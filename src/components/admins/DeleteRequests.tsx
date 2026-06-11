import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveDeleteRequest,
  DeleteRequestRecord,
  listDeleteRequests,
  rejectDeleteRequest,
} from '@/src/api/endpoints/delete-requests.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ban, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export function DeleteRequests() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [confirming, setConfirming] = useState<DeleteRequestRecord | null>(null);

  const requestsQuery = useQuery({
    queryKey: queryKeys.deleteRequests,
    queryFn: listDeleteRequests,
  });

  const approveMutation = useMutation({
    mutationFn: approveDeleteRequest,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deleteRequests });
      setConfirming(null);
      toast.success('Account deletion approved', {
        description: result.accountFound
          ? 'The account has been disabled and flagged as deleted.'
          : 'No matching account was found, but the request was marked approved.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to approve request', { description: error.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectDeleteRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deleteRequests });
      toast.success('Deletion request rejected');
    },
    onError: (error: Error) => {
      toast.error('Failed to reject request', { description: error.message });
    },
  });

  const rows = useMemo<DeleteRequestRecord[]>(() => {
    const all = requestsQuery.data ?? [];
    const needle = searchTerm.toLowerCase().trim();
    if (!needle) return all;
    return all.filter(
      (request) =>
        request.email.toLowerCase().includes(needle) ||
        (request.name ?? '').toLowerCase().includes(needle) ||
        request.status.includes(needle),
    );
  }, [requestsQuery.data, searchTerm]);

  const pendingCount = (requestsQuery.data ?? []).filter((r) => r.status === 'pending').length;

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Account Deletion Requests</h2>
            <p className="text-zinc-500">
              Review account deletion requests submitted by users.
              {pendingCount > 0 && ` ${pendingCount} pending.`}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search by email, name, status..."
              className="pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-zinc-500">
                    Loading deletion requests...
                  </TableCell>
                </TableRow>
              )}
              {!requestsQuery.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-zinc-500">
                    No deletion requests found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium text-zinc-900">{request.email}</div>
                    {request.name && <div className="text-xs text-zinc-500">{request.name}</div>}
                  </TableCell>
                  <TableCell className="hidden max-w-xs md:table-cell">
                    <span className="line-clamp-2 text-sm text-zinc-600">{request.reason || '—'}</span>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm text-zinc-600 sm:table-cell">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[request.status] ?? 'bg-zinc-100 text-zinc-700'}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate(request.id)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-rose-600 text-white hover:bg-rose-700"
                          onClick={() => setConfirming(request)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">
                        {request.resolvedAt ? new Date(request.resolvedAt).toLocaleDateString() : '—'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
          <DialogContent className="overflow-hidden border-zinc-200 p-0 sm:max-w-md">
            <DialogHeader>
              <div className="border-b border-zinc-200 bg-rose-50 px-5 py-4">
                <DialogTitle className="flex items-center gap-2 text-base font-semibold text-rose-700">
                  <ShieldAlert className="h-4 w-4" />
                  Approve Account Deletion
                </DialogTitle>
                <p className="mt-1 text-xs text-rose-600">
                  This disables the account and flags it as deleted. It cannot be undone from here.
                </p>
              </div>
            </DialogHeader>
            <div className="space-y-4 px-5 py-5">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <div className="font-medium text-zinc-900">{confirming?.email}</div>
                {confirming?.name && <div className="text-zinc-500">{confirming.name}</div>}
                {confirming?.reason && <div className="mt-2 text-xs text-zinc-500">"{confirming.reason}"</div>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-rose-600 text-white hover:bg-rose-700"
                  disabled={approveMutation.isPending}
                  onClick={() => confirming && approveMutation.mutate(confirming.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {approveMutation.isPending ? 'Deleting...' : 'Delete Account'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
