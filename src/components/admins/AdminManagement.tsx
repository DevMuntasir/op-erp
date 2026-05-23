import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteAdmin, listAdmins } from '@/src/api/endpoints/admins.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { User } from '@/src/shared/types/domain';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export function AdminManagement() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteType, setInviteType] = useState<'password' | 'invitation'>('invitation');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const adminsQuery = useQuery({
    queryKey: queryKeys.admins,
    queryFn: listAdmins,
  });

  const inviteMutation = useMutation({
    mutationFn: inviteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admins });
      setIsAdding(false);
      setInviteType('invitation');
      setName('');
      setEmail('');
      setPassword('');
      toast.success('Admin invitation sent');
    },
    onError: (error: Error) => {
      toast.error('Failed to invite admin', { description: error.message });
    },
  });

  const rows = useMemo<User[]>(() => {
    const all = adminsQuery.data ?? [];
    const needle = searchTerm.toLowerCase().trim();
    if (!needle) return all;
    return all.filter((admin) => admin.name.toLowerCase().includes(needle) || (admin.email ?? '').toLowerCase().includes(needle));
  }, [adminsQuery.data, searchTerm]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await inviteMutation.mutateAsync({
      email: email.toLowerCase().trim(),
      type: inviteType,
      role: 'admin',
      password: inviteType === 'password' ? password : '',
      name: name.trim(),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Admin Management</h2>
            <p className="text-zinc-500">Manage admin users and send new admin invitations.</p>
          </div>
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger
              render={
                <Button className="w-full gap-2 sm:w-auto" size="sm">
                  <UserPlus className="h-4 w-4" />
                  Add Admin
                </Button>
              }
            />
            <DialogContent className="overflow-hidden border-zinc-200 p-0 sm:max-w-md">
              <DialogHeader>
                <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">
                  <DialogTitle className="text-base font-semibold">Invite Admin</DialogTitle>
                  <p className="mt-1 text-xs text-zinc-500">Create admin access with invitation or password.</p>
                </div>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1">
                  <button
                    type="button"
                    onClick={() => setInviteType('invitation')}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      inviteType === 'invitation' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Invitation
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteType('password')}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      inviteType === 'password' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Password
                  </button>
                </div>

                <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-email" className="text-xs uppercase tracking-wide text-zinc-500">
                      Email
                    </Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="admin@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-name" className="text-xs uppercase tracking-wide text-zinc-500">
                      Name
                    </Label>
                    <Input
                      id="admin-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Admin Name"
                      required
                    />
                  </div>
                </div>

                {inviteType === 'password' && (
                  <div className="space-y-1.5 rounded-lg border border-zinc-200 p-3">
                    <Label htmlFor="admin-password" className="text-xs uppercase tracking-wide text-zinc-500">
                      Password
                    </Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Set temporary password"
                      required={inviteType === 'password'}
                    />
                  </div>
                )}

                <Button type="submit" className="h-10 w-full" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Processing...' : inviteType === 'password' ? 'Create Admin' : 'Send Invitation'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search admins by name or email..."
            className="h-10 border-zinc-200 pl-10"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <Card className="overflow-hidden border-zinc-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Admin</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((admin) => (
                  <TableRow key={admin.uid}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={admin.photoURL ?? undefined} />
                        <AvatarFallback>{admin.name?.[0] || 'A'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{admin.name}</div>
                        <div className="truncate text-xs text-zinc-500">{admin.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${admin.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                        <span className="text-sm capitalize text-zinc-600">{admin.status ?? 'offline'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {admin.createdAt ? new Date(admin.createdAt).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-zinc-400">
                      <ShieldCheck className="mx-auto mb-3 h-8 w-8 opacity-20" />
                      <p className="text-sm font-medium">No admins found.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
