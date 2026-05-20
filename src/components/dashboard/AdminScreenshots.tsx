import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Session, Screenshot, User } from '@/src/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar, Camera, User as UserIcon, Monitor, Activity, Maximize2, Eye } from 'lucide-react';
import { formatDateTimeHalifax } from '@/src/lib/presence';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export const AdminScreenshots = () => {
  const { user } = useAuth();
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!user) return;

    if (isSuperAdmin) {
      const qAdmins = query(collection(db, 'profiles'), where('role', '==', 'admin'));
      const unsubAdmins = onSnapshot(qAdmins, (snap) => {
        setAdmins(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
      }, (error) => console.error("AdminScreenshots unsubAdmins error:", error));
      return unsubAdmins;
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!user) return;

    const currentAdminId = isSuperAdmin 
      ? (selectedAdminId === 'all' ? null : selectedAdminId) 
      : (user.role === 'admin' ? user.uid : (user.adminId || user.uid));

    // Fetch users for mapping - if super admin and 'all', fetch all profiles
    let qUsers;
    if (isSuperAdmin && selectedAdminId === 'all') {
      qUsers = query(collection(db, 'profiles'));
    } else {
      qUsers = query(collection(db, 'profiles'), where('adminId', '==', currentAdminId || user.uid));
    }

    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    }, (error) => console.error("AdminScreenshots unsubUsers error:", error));

    // Fetch screenshots
    let qScreens;
    if (isSuperAdmin && selectedAdminId === 'all') {
      qScreens = query(
        collection(db, 'screenshots'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
    } else {
      qScreens = query(
        collection(db, 'screenshots'),
        where('adminId', '==', currentAdminId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
    }

    const unsubScreens = onSnapshot(qScreens, (snap) => {
      setScreenshots(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("AdminScreenshots unsubScreens error:", error);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubScreens();
    };
  }, [user, selectedAdminId, isSuperAdmin]);

  const getUserName = (userId: string) => {
    return users.find(u => u.uid === userId)?.name || 'Unknown Staff';
  };

  const getUserAvatar = (userId: string) => {
    return users.find(u => u.uid === userId)?.photoURL;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-10 bg-[#FAFAFA] selection:bg-zinc-200">
      <div className="max-w-[1600px] mx-auto space-y-10 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-200 pb-8">
          <div className="space-y-1">
            <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 flex items-center gap-4">
              Monitoring Center
              <Badge variant="outline" className="h-6 px-2 text-[10px] font-bold uppercase tracking-widest bg-zinc-100 border-zinc-200">
                Live Captures
              </Badge>
            </h2>
            <p className="text-zinc-500 font-medium">Real-time activity tracking and employee log analysis.</p>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1.5 rounded-xl shadow-sm">
              <div className="px-3 py-1 flex flex-col">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest text-left">Internal Agency Filter</span>
                <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                  <SelectTrigger className="h-8 border-none bg-transparent p-0 w-[180px] font-bold focus:ring-0">
                    <SelectValue placeholder="All Agencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Global Agencies</SelectItem>
                    {admins.map(admin => (
                      <SelectItem key={admin.uid} value={admin.uid}>{admin.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {screenshots.map((screen) => (
            <Card 
              key={screen.id} 
              className="group border-zinc-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden bg-white cursor-pointer"
              onClick={() => setSelectedScreenshot(screen)}
            >
              <div className="relative aspect-video bg-zinc-100 overflow-hidden">
                <img 
                  src={screen.storagePath} 
                  alt="Staff activity screenshot"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3">
                  <Maximize2 className="w-10 h-10 text-white stroke-[1.5]" />
                  <Badge className="bg-white text-zinc-900 font-black border-none shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    View Capture
                  </Badge>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                   <div className="bg-zinc-900/80 backdrop-blur-md rounded-lg px-2 py-1 text-[10px] font-black text-white uppercase tracking-wider">
                     {formatDateTimeHalifax(screen.timestamp).split(',')[1]}
                   </div>
                </div>
                <div className="absolute bottom-3 left-3">
                   <Badge className={`text-[9px] font-black uppercase tracking-widest border-none ${
                     screen.activityLevel > 70 ? 'bg-emerald-500 text-white' :
                     screen.activityLevel > 30 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                   }`}>
                     {screen.activityLevel}% Activity
                   </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9 border-2 border-zinc-50 shadow-sm rounded-xl">
                    <AvatarImage src={getUserAvatar(screen.userId)} />
                    <AvatarFallback className="bg-zinc-100 text-xs font-bold">{getUserName(screen.userId)[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-zinc-900 truncate tracking-tight">
                      {getUserName(screen.userId)}
                    </p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold">
                      <Clock className="w-3 h-3" />
                      {formatDateTimeHalifax(screen.timestamp).split(',')[0]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {screenshots.length === 0 && !loading && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-400">
              <Camera className="w-12 h-12 mb-4 opacity-10" />
              <p className="font-medium">No screenshots captured yet.</p>
              <p className="text-sm">Active shifts will automatically log activity snapshots here.</p>
            </div>
          )}
        </div>

        <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
          <DialogContent className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 bg-zinc-950/98 border-none shadow-none flex flex-col items-center justify-start overflow-y-auto z-[100]">
            {selectedScreenshot && (
              <div className="w-full min-h-full flex flex-col items-center justify-center p-4 sm:p-8 gap-4 sm:gap-8">
                <div className="relative bg-zinc-900 w-full max-w-6xl aspect-video sm:flex-1 flex items-center justify-center rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/5 shrink-0">
                  <img 
                    src={selectedScreenshot.storagePath} 
                    alt="Full size staff capture"
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 flex justify-between items-start pointer-events-none">
                    <Badge className="bg-emerald-500 text-white font-black border-none uppercase tracking-widest px-2 sm:px-4 py-1 sm:py-2 text-[9px] sm:text-xs shadow-lg">
                      Live Diagnostic Capture
                    </Badge>
                  </div>
                </div>

                <div className="w-full max-w-6xl pb-8">
                  <div className="bg-zinc-900/90 backdrop-blur-xl px-4 sm:px-8 py-3 sm:py-5 rounded-2xl sm:rounded-[3rem] flex flex-col sm:flex-row items-center gap-4 sm:gap-12 text-white shadow-2xl border border-white/10">
                    <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto">
                      <Avatar className="w-10 h-10 sm:w-16 sm:h-16 border-2 border-white/20 shadow-2xl rounded-xl sm:rounded-[2rem] shrink-0">
                        <AvatarImage src={getUserAvatar(selectedScreenshot.userId)} />
                        <AvatarFallback className="bg-zinc-800 text-white font-black">{getUserName(selectedScreenshot.userId)[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-2xl font-black text-white tracking-tight truncate">{getUserName(selectedScreenshot.userId)}</h3>
                        <p className="text-[9px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none truncate mt-1">
                          {selectedScreenshot.activityLevel}% Diagnostic Activity • {formatDateTimeHalifax(selectedScreenshot.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:block h-12 w-px bg-white/10" />

                    <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        className="flex-1 sm:flex-initial rounded-xl sm:rounded-2xl border-white/10 text-white hover:bg-white/10 font-bold h-10 sm:h-14 px-4 sm:px-8 text-[10px] sm:text-sm"
                        onClick={() => window.open(selectedScreenshot.storagePath, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Original
                      </Button>
                      <Button 
                        className="flex-1 sm:flex-initial rounded-xl sm:rounded-2xl bg-white text-zinc-900 hover:bg-zinc-100 font-extrabold h-10 sm:h-14 px-6 sm:px-10 text-[10px] sm:text-sm"
                        onClick={() => setSelectedScreenshot(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
