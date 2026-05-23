import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { listNotifications, markNotificationRead } from '@/src/api/endpoints/notifications.api';
import { useAuth } from '@/src/App';
import { BrandLogo } from '@/src/components/layout/BrandLogo';
import { TrackingControls } from '@/src/components/tasks/TrackingControls';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Box,
  Briefcase,
  CheckSquare,
  CreditCard,
  FileText,
  FolderKanban,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Monitor,
  Phone,
  Search,
  Settings,
  Sparkles,
  User as UserIcon,
  UserPlus,
  Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Users, label: 'Employees', path: '/admin/employees' },
    { icon: Briefcase, label: 'Clients', path: '/admin/clients' },
    { icon: FolderKanban, label: 'Projects', path: '/admin/projects' },
    { icon: CreditCard, label: 'Billing', path: '/admin/billing' },
    { icon: Sparkles, label: 'Reporting', path: '/admin/reports' },
    { icon: Globe, label: 'Client Portal', path: '/client' },
    { icon: Monitor, label: 'Monitoring', path: '/admin/monitoring' },
    { icon: History, label: 'History', path: '/admin/history' },
    { icon: CheckSquare, label: 'Tasks', path: '/admin/tasks' },
    { icon: UserPlus, label: 'Leads', path: '/admin/leads' },
    { icon: FileText, label: 'Proposals', path: '/admin/proposals' },
    { icon: Map, label: 'Lead Finder', path: '/admin/finder' },
    { icon: MessageSquare, label: 'Messages', path: '/admin/messages' },
    { icon: Phone, label: 'Call History', path: '/admin/calls' },
    { icon: UserIcon, label: 'Profile', path: '/admin/profile' },
  ],
  super_admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/super-admin' },
    { icon: Users, label: 'Admins', path: '/super-admin/admins' },
    { icon: Users, label: 'Employees', path: '/super-admin/employees' },
    { icon: Briefcase, label: 'Clients', path: '/super-admin/clients' },
    { icon: FolderKanban, label: 'Projects', path: '/super-admin/projects' },
    { icon: CreditCard, label: 'Billing', path: '/super-admin/billing' },
    { icon: Sparkles, label: 'Reporting', path: '/super-admin/reports' },
    { icon: Globe, label: 'Client Portal', path: '/client' },
    { icon: Monitor, label: 'Monitoring', path: '/super-admin/monitoring' },
    { icon: History, label: 'History', path: '/super-admin/history' },
    { icon: CheckSquare, label: 'Tasks', path: '/super-admin/tasks' },
    { icon: UserPlus, label: 'Leads', path: '/super-admin/leads' },
    { icon: FileText, label: 'Proposals', path: '/super-admin/proposals' },
    { icon: Map, label: 'Lead Finder', path: '/super-admin/finder' },
    { icon: MessageSquare, label: 'Messages', path: '/super-admin/messages' },
    { icon: Phone, label: 'Call History', path: '/super-admin/calls' },
    { icon: UserIcon, label: 'Profile', path: '/super-admin/profile' },
  ],
  employee: [
    { icon: LayoutDashboard, label: 'My Dashboard', path: '/employee' },
    { icon: Sparkles, label: 'Client Reports', path: '/employee/reports' },
    { icon: Briefcase, label: 'My Clients', path: '/employee/clients' },
    { icon: History, label: 'My History', path: '/employee/history' },
    { icon: CheckSquare, label: 'My Tasks', path: '/employee/tasks' },
    { icon: UserPlus, label: 'Leads', path: '/employee/leads' },
    { icon: FileText, label: 'Proposals', path: '/employee/proposals' },
    { icon: Map, label: 'Lead Finder', path: '/employee/finder' },
    { icon: MessageSquare, label: 'Messages', path: '/employee/messages' },
    { icon: Phone, label: 'Call History', path: '/employee/calls' },
    { icon: UserIcon, label: 'Profile', path: '/employee/profile' },
  ]
};

function SidebarContent({ 
  user, 
  currentNavItems, 
  location, 
  setIsMobileMenuOpen, 
  logout, 
  navigate,
  onTriggerInstall,
  hasDeferredPrompt
}: { 
  user: any, 
  currentNavItems: any[], 
  location: any, 
  setIsMobileMenuOpen: (open: boolean) => void, 
  logout: () => void, 
  navigate: (path: string) => void,
  onTriggerInstall: () => void,
  hasDeferredPrompt: boolean
}) {
  return (
    <ScrollArea className="h-full w-full">
      <div className="px-6 py-8 sm:py-10 min-h-full flex flex-col">
        <BrandLogo className="w-28 md:w-40 mb-6 sm:mb-8" />

        <nav className="space-y-1 flex-1">
          {currentNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                    : 'text-zinc-500 hover:text-brand hover:bg-brand/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-zinc-100 space-y-4">
          {/* iOS Install Prompt Helper */}
          {hasDeferredPrompt ? (
            <Button 
              onClick={onTriggerInstall}
              className="w-full justify-start gap-3 bg-brand text-white shadow-lg shadow-brand/20 hover:bg-zinc-800 font-bold text-xs h-10 rounded-xl"
            >
              <Monitor className="w-4 h-4" />
              Download Web App
            </Button>
          ) : (
            <Popover>
              <PopoverTrigger render={
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 border-emerald-100 hover:border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold text-xs h-10 rounded-xl"
                >
                  <Monitor className="w-4 h-4" />
                  Install on iOS/Mobile
                </Button>
              } />
              <PopoverContent className="w-64 p-4 rounded-xl shadow-xl border-zinc-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Sparkles className="w-4 h-4" />
                    <h4 className="font-bold text-sm">App Ready</h4>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    To install this CRM on your iPhone/iPad:
                  </p>
                  <ol className="text-xs text-zinc-600 space-y-2 list-decimal list-inside">
                    <li>Tap the <span className="font-bold text-zinc-900 mx-1 inline-block"><Box className="w-3 h-3 mb-0.5 inline" /> Share</span> icon in Safari</li>
                    <li>Scroll down and tap <span className="font-bold text-zinc-900">Add to Home Screen</span></li>
                    <li>Tap <span className="font-bold text-brand">Add</span> to complete</li>
                  </ol>
                  <div className="pt-2">
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700 uppercase font-black">Native Feel</Badge>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.photoURL} />
              <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">{user?.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 px-3 text-zinc-500 hover:text-red-600 hover:bg-red-50 font-bold"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

export const AppLayout: React.FC<{ children: React.ReactNode, role: 'admin' | 'super_admin' | 'employee' }> = ({ children, role }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: listNotifications,
    enabled: !!user,
    refetchInterval: 15_000,
  });

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  const notifications = notificationsQuery.data ?? [];

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const currentNavItems = navItems[role];
  const basePath = role === 'employee' ? '/employee' : role === 'super_admin' ? '/super-admin' : '/admin';

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    await Promise.all(unread.map((notification) => readMutation.mutateAsync(notification.id)));
  };

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden font-sans">
      <aside className="hidden lg:flex w-72 h-full bg-white border-r border-zinc-200 flex-col shrink-0 shadow-[1px_0_10_rgba(0,0,0,0.02)]">
        <SidebarContent 
          user={user} 
          currentNavItems={currentNavItems} 
          location={location} 
          setIsMobileMenuOpen={setIsMobileMenuOpen} 
          logout={logout} 
          navigate={navigate} 
          onTriggerInstall={triggerInstall}
          hasDeferredPrompt={!!deferredPrompt}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-14 sm:h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-4 lg:flex-1">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger render={
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-xl hover:bg-zinc-100 shrink-0">
                  <Menu className="w-5 h-5 text-zinc-900" />
                </Button>
              } />
              <SheetContent side="left" className="p-0 w-72 h-full flex flex-col">
                <SidebarContent 
                  user={user} 
                  currentNavItems={currentNavItems} 
                  location={location} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  logout={logout} 
                  navigate={navigate} 
                  onTriggerInstall={triggerInstall}
                  hasDeferredPrompt={!!deferredPrompt}
                />
              </SheetContent>
            </Sheet>

            <div className="relative w-full max-w-xs hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input 
                placeholder="Search resources..." 
                className="pl-10 h-9 bg-zinc-50 border-none rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-zinc-200"
              />
            </div>
            <div className="hidden sm:max-md:flex md:hidden items-center shrink-0">
              <BrandLogo className="w-20" />
            </div>
            
            {/* Mobile-only Install Hint */}
            <div className="sm:hidden -ml-2">
              <Popover>
                <PopoverTrigger render={
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-brand/5 text-brand">
                    <Sparkles className="w-4 h-4" />
                  </Button>
                } />
                <PopoverContent className="w-[85vw] p-4 ml-6 mt-2 rounded-2xl shadow-2xl">
                  <h4 className="font-black text-sm text-zinc-900 mb-2">Install for Native Feel</h4>
                  <p className="text-xs text-zinc-500 mb-4">Run this app full-screen from your home screen just like a native iOS app.</p>
                  <div className="space-y-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    <div className="flex gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold shrink-0">1</span>
                      <p className="text-[11px] text-zinc-600">Tap the <span className="font-bold">Share</span> button at bottom</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold shrink-0">2</span>
                      <p className="text-[11px] text-zinc-600">Find <span className="font-bold">"Add to Home Screen"</span></p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
            <div className="flex items-center tracking-controls-container">
              <TrackingControls />
            </div>
            
            <div className="h-4 w-[1px] bg-zinc-200 mx-0.5 hidden sm:block" />

            <Popover open={isNotificationsOpen} onOpenChange={(open) => {
              setIsNotificationsOpen(open);
              if (open) markAllAsRead();
            }}>
              <PopoverTrigger render={
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl text-zinc-500 hover:bg-zinc-100 shrink-0">
                  <Bell className="w-4.5 h-4.5" />
                  {notifications.some(n => !n.isRead) && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                </Button>
              } />
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0 rounded-2xl shadow-2xl border-zinc-200 mt-2" align="end">
                <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 rounded-t-2xl">
                  <h3 className="font-bold text-sm text-zinc-900">Notifications</h3>
                  <Badge className="bg-zinc-900 text-[10px] h-5">{notifications.filter(n => !n.isRead).length} NEW</Badge>
                </div>
                <ScrollArea className="h-[60vh] sm:h-80">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-zinc-50">
                      {notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-4 hover:bg-zinc-50 transition-colors cursor-pointer relative ${!n.isRead ? 'bg-zinc-50/30' : ''}`}
                          onClick={() => {
                            if (!n.isRead) {
                              readMutation.mutate(n.id);
                            }
                            if (n.type === 'message') {
                              navigate(`${basePath}/messages`);
                            } else if (n.type === 'task') {
                              navigate(`${basePath}/tasks`);
                            }
                            setIsNotificationsOpen(false);
                          }}
                        >
                          {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                          <p className="text-sm font-bold text-zinc-900">{n.title}</p>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] font-bold text-zinc-400 mt-2 tracking-widest uppercase">
                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-zinc-200" />
                      </div>
                      <p className="text-zinc-500 text-xs font-medium">Clear for take off.</p>
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-9 w-9 rounded-xl text-zinc-500 hover:bg-zinc-100 shrink-0">
              <Settings className="w-5 h-5" />
            </Button>

            <div className="pl-0.5">
              <Avatar className="w-8 h-8 ring-2 ring-zinc-100 ring-offset-2">
                <AvatarImage src={user?.photoURL} />
                <AvatarFallback className="bg-zinc-900 text-[10px] text-white font-bold">{user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>


          <div className="flex-1 flex flex-col min-h-0 relative overflow-y-auto">
            {children}
          </div>

          {/* Mobile Bottom Navigation - "App Feel" */}
          <nav className="lg:hidden h-16 bg-white border-t border-zinc-200 flex items-center justify-around px-2 pb-safe shrink-0 z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
            {currentNavItems.slice(0, 5).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-1 w-14 h-full transition-all ${
                    isActive ? 'text-brand' : 'text-zinc-400'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-brand/10' : ''}`}>
                    <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {item.label.split(' ').pop()}
                  </span>
                </Link>
              );
            })}
          </nav>
        </main>
      </div>
  );
};
