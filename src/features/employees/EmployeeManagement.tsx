import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createInvite, deleteEmployee, listEmployees, updateEmployee } from '@/src/api/endpoints/employees.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { User, UserRole } from '@/src/shared/types/domain';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/src/components/shared/dialogs';
import { Search, Trash2, UserPlus, Copy, ExternalLink, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type StaffRow = User & { source: 'employee' | 'invite'; inviteId?: string; acceptedAt?: string | null };

export function EmployeeManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [deletingUser, setDeletingUser] = useState<StaffRow | null>(null);

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees,
    queryFn: listEmployees,
  });

  const inviteMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      setIsAdding(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      toast.success('Employee created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create employee', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      toast.success('Employee removed successfully');
      setDeletingUser(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to remove employee', { description: error.message });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: UserRole }) => updateEmployee(uid, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      toast.success('Employee updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update employee', { description: error.message });
    },
  });

  const rows = useMemo<StaffRow[]>(() => {
    const employeeRows =
      employeesQuery.data?.map((employee) => ({
        ...employee,
        source: 'employee' as const,
      })) ?? [];

    return employeeRows.filter((row) => {
      const needle = searchTerm.toLowerCase();
      return row.name.toLowerCase().includes(needle) || (row.email ?? '').toLowerCase().includes(needle);
    });
  }, [employeesQuery.data, searchTerm]);

  const handleSendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    await inviteMutation.mutateAsync({
      email: newEmail.toLowerCase().trim(),
      role: 'employee',
      type: 'password',
      password: newPassword,
      name: newName.trim(),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Employee Management</h2>
            <p className="text-zinc-500">Manage agency staff and roles.</p>
          </div>
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger
              render={
                <Button className="w-full gap-2 sm:w-auto " size="sm">
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </Button>
              }
            />
            <DialogContent className="overflow-hidden border-zinc-200 p-0 sm:max-w-md">
              <DialogHeader>
                <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">
                  <DialogTitle className="text-base font-semibold">Create Employee</DialogTitle>
                  <p className="mt-1 text-xs text-zinc-500">Create a password-based employee account.</p>
                </div>
              </DialogHeader>
              <form onSubmit={handleSendInvite} className="space-y-4 px-5 py-5">
                <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs uppercase tracking-wide text-zinc-500">
                      Email
                    </Label>
                    <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs uppercase tracking-wide text-zinc-500">
                      Name
                    </Label>
                    <Input id="name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs uppercase tracking-wide text-zinc-500">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-200 pt-1">
                  <Button type="submit" className="h-10 w-full" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? 'Processing...' : 'Create Account'}
                  </Button>
                </div>
                <input type="hidden" name="type" value="password" />
                <input type="hidden" name="role" value="employee" />
                <input type="hidden" name="name" value={newName} />
                <input type="hidden" name="email" value={newEmail} />
                <input type="hidden" name="password" value={newPassword} />
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs text-zinc-500 hover:text-zinc-700"
                  onClick={() => {
                    setNewEmail('');
                    setNewName('');
                    setNewPassword('');
                  }}
                >
                  Reset form
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search employees by name or email..."
            className="h-10 border-zinc-200 pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
  
        <Card className="overflow-hidden border-zinc-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((employee) => (
                  <TableRow key={`${employee.source}-${employee.uid}`}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.photoURL ?? undefined} />
                        <AvatarFallback>{employee.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{employee.name}</div>
                        <div className="truncate text-xs text-zinc-500">{employee.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${employee.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                        <span className="text-sm capitalize text-zinc-600">{employee.status}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <Button size="icon" variant="ghost" onClick={() => navigate(employee.uid)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingUser(employee)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-zinc-400">
                      <Users className="mx-auto mb-3 h-8 w-8 opacity-20" />
                      <p className="text-sm font-medium">No employees found.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <ConfirmDialog
          isOpen={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => deletingUser && deletingUser.source === 'employee' && deleteMutation.mutate(deletingUser.uid)}
          isLoading={deleteMutation.isPending}
          title="Remove Employee"
          description={`Are you sure you want to remove ${deletingUser?.name || deletingUser?.email}?`}
        />
      </div>
    </div>
  );
}
