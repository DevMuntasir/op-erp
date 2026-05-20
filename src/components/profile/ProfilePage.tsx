import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/App';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEmployee } from '@/src/api/endpoints/employees.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { User } from '@/src/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User as UserIcon, Mail, Phone, Shield, Save, Loader2 } from 'lucide-react';

export const ProfilePage = () => {
  const { user: authUser, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(authUser);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    photoURL: '',
  });

  useEffect(() => {
    if (!authUser) return;
    setUser(authUser);
    setFormData({
      name: authUser.name || '',
      phoneNumber: authUser.phoneNumber || authUser.phone || '',
      photoURL: authUser.photoURL || '',
    });
  }, [authUser]);

  const canEdit = !!user && user.role === 'employee';

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No active user');
      return updateEmployee(user.uid, {
        name: formData.name,
        phone: formData.phoneNumber,
        photoURL: formData.photoURL,
      });
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update profile', { description: error.message });
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.info('Profile editing is currently enabled for employees only.');
      return;
    }
    await mutation.mutateAsync();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Profile Settings</h1>
          <p className="mt-2 text-zinc-500">Manage your account information and preferences.</p>
        </div>

        <Card className="overflow-hidden border-zinc-200 shadow-sm">
          <CardHeader className="border-b border-zinc-100 bg-zinc-50/50">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white shadow-sm">
                <AvatarImage src={formData.photoURL} />
                <AvatarFallback className="bg-zinc-900 text-2xl text-white">{formData.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{formData.name || 'User'}</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  <span className="capitalize">{user.role}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      placeholder="Your full name"
                      required
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Input id="email" value={user.email || ''} className="bg-zinc-50 pl-10" disabled readOnly />
                  </div>
                  <p className="text-[10px] text-zinc-400">Email cannot be changed.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Input
                      id="phone"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="pl-10"
                      placeholder="+1 (555) 000-0000"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo">Photo URL</Label>
                  <Input
                    id="photo"
                    value={formData.photoURL}
                    onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={mutation.isPending || !canEdit} className="gap-2">
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {user.role === 'admin' && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-900">Admin Privileges</p>
                <p className="mt-1 text-xs text-amber-700">
                  Self-edit is currently limited by the published backend contract. Employee profile edits remain available from the app, and admin staff changes can be managed from the{' '}
                  <Link to="/admin/employees" className="font-medium underline">
                    Employees
                  </Link>{' '}
                  page.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
