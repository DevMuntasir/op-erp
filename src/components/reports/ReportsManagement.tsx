import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/App';
import {
  Sparkles,
  FileText,
  Loader2,
  Trash2,
  Edit2,
  Copy,
  Check,
  FileDown,
  Image as ImageIcon,
  X,
  Upload,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/src/components/shared/dialogs/ConfirmDialog';
import { queryKeys } from '@/src/shared/constants/query-keys';
import {
  listReports,
  generateReport,
  updateReport,
  deleteReport,
} from '@/src/api/endpoints/reports.api';
import { listProjects } from '@/src/api/endpoints/projects.api';
import { Report } from '@/src/shared/types/domain';
import { compressImage, MarkdownComponents, exportReportPDF } from './report-utils';

interface PendingShot {
  id: string;
  base64: string;
  mimeType: string;
  preview: string;
  label?: string;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  final: { label: 'Final', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  sent: { label: 'Sent', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const key = (status || 'draft').toLowerCase();
  const config = statusConfig[key] || { label: status || 'Draft', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
  return <Badge className={cn('capitalize border font-semibold', config.cls)}>{config.label}</Badge>;
};

const toDateLabel = (value: unknown): string => {
  if (!value) return '';
  const anyVal = value as any;
  const date = typeof anyVal?.toDate === 'function' ? anyVal.toDate() : new Date(anyVal);
  return Number.isNaN(date?.getTime?.()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const ReportsManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scope = user?.role ?? 'anonymous';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Generate form
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [reportingPeriod, setReportingPeriod] = useState('');
  const [employeeNotes, setEmployeeNotes] = useState('');
  const [shots, setShots] = useState<PendingShot[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form
  const [editTitle, setEditTitle] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editProjectName, setEditProjectName] = useState('');
  const [editPeriod, setEditPeriod] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState('draft');

  const reportsQuery = useQuery({
    queryKey: queryKeys.reports({ scope }),
    queryFn: listReports,
    enabled: !!user,
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects({ scope }),
    queryFn: listProjects,
    enabled: !!user && generateOpen,
  });

  const reports = reportsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const loading = reportsQuery.isLoading;

  const invalidateReports = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reports({ scope }) });
  };

  const stats = useMemo(() => {
    return {
      total: reports.length,
      sent: reports.filter((r) => r.sentToClient || (r.status || '').toLowerCase() === 'sent').length,
      drafts: reports.filter((r) => (r.status || '').toLowerCase() === 'draft').length,
      viewed: reports.filter((r) => r.isViewed).length,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return reports
      .filter((r) => {
        const matchesSearch =
          !term ||
          (r.clientName || '').toLowerCase().includes(term) ||
          (r.projectName || '').toLowerCase().includes(term);
        const matchesStatus = statusFilter === 'all' || (r.status || '').toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const av = new Date((a.createdAt as any) ?? 0).getTime();
        const bv = new Date((b.createdAt as any) ?? 0).getTime();
        return bv - av;
      });
  }, [reports, searchTerm, statusFilter]);

  const resetGenerateForm = () => {
    setTitle('');
    setProjectId('');
    setReportingPeriod('');
    setEmployeeNotes('');
    shots.forEach((s) => URL.revokeObjectURL(s.preview));
    setShots([]);
  };

  const generateMutation = useMutation({
    mutationFn: () =>
      generateReport({
        projectId: projectId || undefined,
        title: title.trim(),
        reportingPeriod: reportingPeriod || undefined,
        employeeNotes: employeeNotes || undefined,
        screenshots: shots.map((s) => ({ base64: s.base64, mimeType: s.mimeType, label: s.label })),
      }),
    onSuccess: (report) => {
      invalidateReports();
      toast.success('Report generated');
      setGenerateOpen(false);
      resetGenerateForm();
      openDetail(report);
    },
    onError: (error: Error) => {
      toast.error('Failed to generate report', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string }) =>
      updateReport(vars.id, {
        title: editTitle,
        clientName: editClientName,
        projectName: editProjectName,
        reportingPeriod: editPeriod,
        contentMd: editContent,
        status: editStatus,
      }),
    onSuccess: (report) => {
      invalidateReports();
      toast.success('Report updated');
      setEditOpen(false);
      setSelectedReport(report);
    },
    onError: (error: Error) => {
      toast.error('Failed to update report', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: (_data, id) => {
      invalidateReports();
      toast.success('Report deleted');
      setDeleteTarget(null);
      if (selectedReport?.id === id) {
        setSelectedReport(null);
        setDetailOpen(false);
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to delete report', { description: error.message });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      try {
        const { base64, preview } = await compressImage(file);
        setShots((prev) => [
          ...prev,
          { id: Math.random().toString(36).slice(2), base64, mimeType: 'image/jpeg', preview },
        ]);
      } catch {
        toast.error(`Failed to process ${file.name}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeShot = (id: string) => {
    setShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((s) => s.id !== id);
    });
  };

  const openDetail = (r: Report) => {
    setSelectedReport(r);
    setDetailOpen(true);
  };

  const openEdit = (r: Report) => {
    setEditTitle(r.projectName || r.clientName || '');
    setEditClientName(r.clientName || '');
    setEditProjectName(r.projectName || '');
    setEditPeriod(r.reportingPeriod || '');
    setEditContent(r.contentMd || '');
    setEditStatus((r.status || 'draft').toLowerCase());
    setSelectedReport(r);
    setEditOpen(true);
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (r: Report) => {
    setExporting(true);
    const toastId = toast.loading('Generating high-fidelity PDF report...');
    const ok = await exportReportPDF(r.clientName || r.projectName || 'Report', 'report-detail-capture', (msg) =>
      toast.error(msg, { id: toastId }),
    );
    if (ok) toast.success('PDF exported successfully', { id: toastId });
    else toast.dismiss(toastId);
    setExporting(false);
  };

  const statCards = [
    { label: 'Total Reports', value: stats.total, icon: FileText, tone: 'text-zinc-900' },
    { label: 'Drafts', value: stats.drafts, icon: Clock, tone: 'text-amber-600' },
    { label: 'Delivered', value: stats.sent, icon: CheckCircle2, tone: 'text-blue-600' },
    { label: 'Viewed', value: stats.viewed, icon: Eye, tone: 'text-emerald-600' },
  ];

  return (
    <div className="p-4 lg:p-8 bg-zinc-50/50 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Reports</h1>
          <p className="text-zinc-500 text-sm">Generate and deliver AI-powered client reports.</p>
        </div>
        <Button
          onClick={() => setGenerateOpen(true)}
          className="bg-zinc-900 text-white hover:bg-zinc-800 h-10 rounded-lg"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-zinc-200 rounded-2xl shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{stat.label}</p>
                <p className={cn('text-2xl font-bold tracking-tight', stat.tone)}>{stat.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                <stat.icon className={cn('w-5 h-5', stat.tone)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search by client or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-zinc-200 focus:ring-brand rounded-lg h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 border-zinc-200 h-10 rounded-lg">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6)
            .fill(0)
            .map((_, i) => <Card key={i} className="animate-pulse h-44 border-zinc-200 rounded-2xl" />)
        ) : filteredReports.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-zinc-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-50 flex items-center justify-center mb-3">
              <FileText className="w-7 h-7 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">
              {reports.length === 0 ? 'No reports yet' : 'No matching reports'}
            </h3>
            <p className="text-zinc-500 text-sm mb-4">
              {reports.length === 0 ? 'Generate your first AI-powered report.' : 'Try adjusting your search or filter.'}
            </p>
            {reports.length === 0 && (
              <Button className="bg-zinc-900 text-white hover:bg-zinc-800 h-9 rounded-lg" onClick={() => setGenerateOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            )}
          </div>
        ) : (
          filteredReports.map((r) => (
            <Card
              key={r.id}
              className="group hover:shadow-md hover:border-brand/40 transition-all border-zinc-200 rounded-2xl overflow-hidden bg-white cursor-pointer flex flex-col"
              onClick={() => openDetail(r)}
            >
              <CardHeader className="pb-3 bg-zinc-50/30 border-b border-zinc-100">
                <div className="flex justify-between items-start gap-2">
                  <StatusBadge status={r.status} />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(r);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(r);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-2 text-base font-bold line-clamp-1 tracking-tight">{r.clientName || 'Untitled report'}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col flex-1">
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Project</p>
                    <p className="text-sm font-semibold text-zinc-900 line-clamp-1">{r.projectName || '—'}</p>
                  </div>
                  {r.reportingPeriod && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Period</p>
                      <p className="text-xs text-zinc-600 line-clamp-1">{r.reportingPeriod}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100">
                  <span className="text-xs text-zinc-400 font-medium">{toDateLabel(r.createdAt) || 'Just now'}</span>
                  <div className="flex items-center gap-2">
                    {r.sentToClient && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">
                        <CheckCircle2 className="w-3 h-3" /> Sent
                      </span>
                    )}
                    {r.isViewed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <Eye className="w-3 h-3" /> Viewed
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* DETAIL DIALOG */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl rounded-2xl p-0 max-h-[92vh] overflow-hidden flex flex-col gap-0">
          {selectedReport && (
            <>
              <DialogHeader className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex-row items-center justify-between gap-4 space-y-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-bold tracking-tight truncate">{selectedReport.clientName || 'Untitled report'}</DialogTitle>
                    <DialogDescription className="text-xs text-zinc-500 truncate">{selectedReport.projectName || 'No project'}</DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={selectedReport.status} />
                </div>
              </DialogHeader>

              {/* Action toolbar */}
              <div className="px-6 py-3 border-b border-zinc-100 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg text-xs border-zinc-200"
                  onClick={() => handleExport(selectedReport)}
                  disabled={exporting}
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1.5 text-brand" />}
                  Save PDF
                </Button>
                <Button size="sm" variant="outline" className="h-9 rounded-lg text-xs border-zinc-200" onClick={() => openEdit(selectedReport)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-9 rounded-lg text-xs" onClick={() => copyContent(selectedReport.contentMd || '')}>
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 rounded-lg text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600 ml-auto"
                  onClick={() => setDeleteTarget(selectedReport)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>

              <ScrollArea className="flex-1 overflow-auto">
                <div className="p-8 bg-white" id="report-detail-capture">
                  <div className="mb-8 pb-6 border-b border-zinc-100">
                    <div className="flex flex-wrap justify-between items-end gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight leading-none mb-1">{selectedReport.clientName || 'Untitled report'}</h2>
                        <p className="text-brand font-semibold text-sm">{selectedReport.projectName}</p>
                      </div>
                      {selectedReport.reportingPeriod && (
                        <div className="text-right">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Reporting Period</p>
                          <p className="text-sm font-semibold text-zinc-900 leading-none">{selectedReport.reportingPeriod}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="report-content markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {selectedReport.contentMd || '_No content available._'}
                    </ReactMarkdown>
                  </div>

                  {selectedReport.screenshotUrls && selectedReport.screenshotUrls.length > 0 && (
                    <div className="mt-10 pt-8 border-t border-zinc-100">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Evidence ({selectedReport.screenshotUrls.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedReport.screenshotUrls.map((img, idx) => (
                          <a
                            key={idx}
                            href={img}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50"
                          >
                            <img src={img} alt={`Evidence ${idx + 1}`} className="w-full aspect-[4/3] object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                            <div className="absolute bottom-2 left-2">
                              <Badge className="bg-black/50 backdrop-blur-md text-white border-none text-[10px] font-bold">Evidence {idx + 1}</Badge>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* GENERATE DIALOG */}
      <Dialog
        open={generateOpen}
        onOpenChange={(o) => {
          if (!o) setGenerateOpen(false);
        }}
      >
        <DialogContent className="max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand" />
              Generate AI Report
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm">
              Provide context and screenshots — the AI drafts the report for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Title *</Label>
              <Input
                placeholder="e.g. May Performance Audit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg border-zinc-200 h-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Project (optional)</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="rounded-lg border-zinc-200 h-10">
                    <SelectValue placeholder={projectsQuery.isLoading ? 'Loading...' : 'Select project'} />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {projects.length === 0 ? (
                        <div className="p-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">No projects</div>
                      ) : (
                        projects.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="font-medium">
                            {p.title || p.name}
                          </SelectItem>
                        ))
                      )}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Reporting Period</Label>
                <Input
                  placeholder="e.g. May 1 - May 7"
                  value={reportingPeriod}
                  onChange={(e) => setReportingPeriod(e.target.value)}
                  className="rounded-lg border-zinc-200 h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Employee Notes</Label>
              <Textarea
                placeholder="Context for the AI..."
                value={employeeNotes}
                onChange={(e) => setEmployeeNotes(e.target.value)}
                className="rounded-lg border-zinc-200 min-h-[90px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Screenshots</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-200 rounded-xl py-6 flex flex-col items-center justify-center gap-2 hover:border-brand/40 hover:bg-brand/[0.02] transition-colors"
              >
                <Upload className="w-6 h-6 text-zinc-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Click to upload (JPG, PNG, WEBP)</span>
              </button>

              {shots.length > 0 && (
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {shots.map((s) => (
                    <div key={s.id} className="relative rounded-lg overflow-hidden border border-zinc-200 group aspect-square">
                      <img src={s.preview} alt="screenshot" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeShot(s.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-lg h-10 border-zinc-200" onClick={() => setGenerateOpen(false)} disabled={generateMutation.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg h-10"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !title.trim() || (shots.length === 0 && !employeeNotes.trim())}
            >
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Edit Report</DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm">Update report details and content.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-lg border-zinc-200 h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="rounded-lg border-zinc-200 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Client Name</Label>
                <Input value={editClientName} onChange={(e) => setEditClientName(e.target.value)} className="rounded-lg border-zinc-200 h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Project Name</Label>
                <Input value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} className="rounded-lg border-zinc-200 h-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Reporting Period</Label>
              <Input value={editPeriod} onChange={(e) => setEditPeriod(e.target.value)} className="rounded-lg border-zinc-200 h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Content (Markdown)</Label>
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="rounded-lg border-zinc-200 min-h-[220px] font-mono text-xs" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-lg h-10 border-zinc-200" onClick={() => setEditOpen(false)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg h-10"
              onClick={() => selectedReport && updateMutation.mutate({ id: selectedReport.id })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Report"
        description={`Are you sure you want to delete the report for "${deleteTarget?.clientName || 'this client'}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
