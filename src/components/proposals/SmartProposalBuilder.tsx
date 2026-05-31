import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProposal,
  generateProposalContent,
  getProposal,
  searchProposalClients,
  updateProposal,
} from '@/src/api/endpoints/proposals.api';
import type { CreateProposalRequest, UpdateProposalRequest } from '@/src/api/endpoints/proposals.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { useAuth } from '@/src/App';
import { Proposal, ProposalSection, ProposalStatus } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Plus, Trash2, ArrowLeft, Save, Sparkles,
  Layout, DollarSign, Clock, CheckCircle2, ChevronRight,
  ChevronLeft, Eye, Send, Target, Zap, Globe, MapPin,
  Building2, Users, BarChart3, Briefcase, Rocket,
  Palette, Video, Share2, Filter, Bot, TrendingUp,
  Mail, PieChart, Search, Magnet, BadgeCheck, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from '@/src/components/layout/BrandLogo';
import { cn } from '@/src/lib/utils';
import { ProposalToolbar, ToolbarLeft, ToolbarRight } from '@/src/components/proposals/ProposalToolbar';

const STEPS = [
  { id: 'client', title: 'Client Info', icon: Building2 },
  { id: 'services', title: 'Strategy', icon: Target },
  { id: 'pricing', title: 'Pricing', icon: DollarSign },
  { id: 'content', title: 'AI Content', icon: Sparkles },
  { id: 'review', title: 'Final Review', icon: Eye },
];

const INDUSTRIES = [
  'E-commerce', 'Real Estate', 'Healthcare', 'SaaS', 'Education', 
  'Home Services', 'Law & Legal', 'Hospitality', 'Fitness', 'Automotive',
  'Finance & Banking', 'Technology & IT', 'Media & Entertainment', 'Manufacturing', 
  'Retail & Fashion', 'Construction & Engineering', 'Non-Profit & NGO', 'Beauty & Wellness', 
  'Food & Beverage', 'Travel & Tourism', 'Gaming & Esports', 'Logistics & Supply Chain', 
  'Professional Services', 'Energy & Utilities', 'Agriculture', 'Pets & Veterinary', 
  'Web3 & Blockchain', 'Government & Public Sector', 'Sports & Recreation', 
  'Creative & Design', 'Other (Custom)'
];

const SERVICE_OPTIONS = [
  { id: 'google_ads', label: 'Google Ads', icon: Target },
  { id: 'meta_ads', label: 'Meta Ads', icon: Layout },
  { id: 'other_ads', label: 'Others Paid Ads', icon: Zap },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'branding', label: 'Branding + Graphics', icon: Palette },
  { id: 'leads', label: 'Lead Gen', icon: Magnet },
  { id: 'content', label: 'Content Creation (Video Production)', icon: Video },
  { id: 'social', label: 'Social media marketing & management', icon: Share2 },
  { id: 'funnel', label: 'Funnel Optimization', icon: Filter },
  { id: 'ai', label: 'AI Automation', icon: Bot },
  { id: 'cro', label: 'CRO', icon: TrendingUp },
  { id: 'email', label: 'Email marketing', icon: Mail },
  { id: 'analytics', label: 'Tracking & Analytics', icon: PieChart },
];

const GROWTH_GOALS = [
  'Lead Generation & Sales',
  'Brand Awareness & Authority',
  'Event Hype & Ticket Sales',
  'Retargeting & ROI Optimization',
  'Customer Retention & LTV',
  'Market Expansion',
  'Community Building'
];

const PRICING_PACKAGES = [
  { id: 'basic', label: 'Basic', price: 1500, features: ['3 Social Posts/week', 'Small Ad Budget Management', 'Monthly Report'] },
  { id: 'standard', label: 'Standard', price: 3500, features: ['Daily Posts', 'Medium Ad Budget', 'Content Creation (4 Videos)', 'Fortnightly Strategy Calls'] },
  { id: 'premium', label: 'Premium', price: 7500, features: ['Multi-channel Ads', 'Full Scale SEO', '8-12 Videos/mo', 'Dedicated Account Manager'] },
];

export const SmartProposalBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const basePath = user?.role === 'super_admin' || user?.role === 'admin' ? '/admin' : '/employee';

  const [currentStep, setCurrentStep] = useState(0);
  const [isCustomIndustry, setIsCustomIndustry] = useState(false);
  const [availablePackages, setAvailablePackages] = useState(PRICING_PACKAGES);
  const [clientQ, setClientQ] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Proposal>>({
    title: '',
    clientName: '',
    clientEmail: '',
    businessName: '',
    industry: '',
    location: '',
    businessDescription: '',
    goals: [],
    targetAudience: '',
    monthlyBudget: 2500,
    services: [],
    deliverables: [],
    pricingPlans: [],
    templateId: 'minimal',
    sections: [],
    status: 'draft'
  });

  // Edit mode: load existing proposal
  const proposalQuery = useQuery({
    queryKey: queryKeys.proposal(id!),
    queryFn: () => getProposal(id!),
    enabled: !!id,
  });

  const loading = !!id && proposalQuery.isLoading;

  useEffect(() => {
    if (proposalQuery.data) {
      const data = proposalQuery.data;
      setFormData({ ...data });
      if (data.pricingPlans && data.pricingPlans.length > 0) {
        const stored = data.pricingPlans.map(p => ({
          id: p.id,
          label: p.label,
          price: p.value,
          features: [...(p.items ?? [])]
        }));
        setAvailablePackages(prev => {
          const others = prev.filter(p => !stored.find(s => s.id === p.id));
          return [...stored, ...others];
        });
      }
      if (data.industry && !INDUSTRIES.slice(0, -1).includes(data.industry)) {
        setIsCustomIndustry(true);
      }
    }
  }, [proposalQuery.data]);

  useEffect(() => {
    if (proposalQuery.isError) {
      toast.error('Failed to load proposal');
      navigate(`${basePath}/proposals`);
    }
  }, [proposalQuery.isError]);

  // Client search
  const clientSearchQuery = useQuery({
    queryKey: ['proposal-client-search', clientQ],
    queryFn: () => searchProposalClients(clientQ),
    enabled: clientQ.length >= 2,
    staleTime: 10_000,
  });

  const updateFormData = (updates: Partial<Proposal>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const toggleService = (service: string) => {
    const current = formData.services || [];
    if (current.includes(service)) {
      updateFormData({ services: current.filter(s => s !== service) });
    } else {
      updateFormData({ services: [...current, service] });
    }
  };

  const toggleGoal = (goal: string) => {
    const current = (formData.goals as string[]) || [];
    if (current.includes(goal)) {
      updateFormData({ goals: current.filter(g => g !== goal) });
    } else {
      updateFormData({ goals: [...current, goal] });
    }
  };

  const togglePricingPlan = (pkg: typeof PRICING_PACKAGES[0]) => {
    const exists = formData.pricingPlans?.find(p => p.id === pkg.id);

    if (exists) {
      updateFormData({ pricingPlans: [] });
    } else {
      updateFormData({
        pricingPlans: [{
          id: pkg.id,
          label: pkg.label,
          value: pkg.price,
          items: [...pkg.features]
        }]
      });
    }
  };

  const updatePackageDraft = (id: string, updates: Partial<typeof PRICING_PACKAGES[0]>) => {
    setAvailablePackages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    
    // Also update in formData if selected
    if (formData.pricingPlans?.find(p => p.id === id)) {
      const selected = formData.pricingPlans.map(p => {
        if (p.id === id) {
          return {
            ...p,
            label: updates.label ?? p.label,
            value: updates.price ?? p.value,
            items: updates.features ?? p.items
          };
        }
        return p;
      });
      updateFormData({ pricingPlans: selected });
    }
  };

  const addFeature = (pkgId: string) => {
    const pkg = availablePackages.find(p => p.id === pkgId);
    if (pkg) {
      updatePackageDraft(pkgId, { features: [...pkg.features, 'New Service Item'] });
    }
  };

  const removeFeature = (pkgId: string, index: number) => {
    const pkg = availablePackages.find(p => p.id === pkgId);
    if (pkg) {
      const newFeatures = pkg.features.filter((_, i) => i !== index);
      updatePackageDraft(pkgId, { features: newFeatures });
    }
  };

  const updateFeature = (pkgId: string, index: number, value: string) => {
    const pkg = availablePackages.find(p => p.id === pkgId);
    if (pkg) {
      const newFeatures = [...pkg.features];
      newFeatures[index] = value;
      updatePackageDraft(pkgId, { features: newFeatures });
    }
  };

  // AI content generation mutation
  const generateMutation = useMutation({
    mutationFn: (data: Partial<Proposal>) =>
      generateProposalContent({
        clientName: data.clientName!,
        businessName: data.businessName ?? undefined,
        location: data.location ?? undefined,
        businessDescription: data.businessDescription ?? undefined,
        targetAudience: data.targetAudience ?? undefined,
        industry: data.industry ?? undefined,
        goals: Array.isArray(data.goals) ? data.goals : undefined,
        services: data.services ?? undefined,
        monthlyBudget: data.monthlyBudget ?? undefined,
        currency: data.currency ?? undefined,
        pricingPlans: data.pricingPlans,
      }),
    onSuccess: (result) => {
      updateFormData({ sections: result.sections });
      toast.success('AI Proposal Generated!');
      setCurrentStep(4);
    },
    onError: (error: Error) => {
      toast.error('AI Generation failed', { description: error.message });
    },
  });

  const handleGenerateAI = () => {
    if (!formData.clientName) {
      toast.error('Please enter client details first');
      setCurrentStep(0);
      return;
    }
    generateMutation.mutate(formData);
  };

  // Create and update mutations
  const createMutation = useMutation({
    mutationFn: (body: CreateProposalRequest) => createProposal(body),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalSummary });
      toast.success('Proposal created');
      navigate(`${basePath}/proposals/edit/${created.id}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create proposal', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProposalRequest }) =>
      updateProposal(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposal(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalSummary });
      toast.success('Proposal updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to save proposal', { description: error.message });
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending;
  const generating = generateMutation.isPending;

  const handleSave = () => {
    const totalValue = formData.pricingPlans?.reduce((s, p) => s + (p.value ?? 0), 0) ?? 0;
    const title = formData.title || `Proposal for ${formData.businessName || formData.clientName}`;

    if (id) {
      updateMutation.mutate({
        id,
        body: { ...formData, title, totalValue } as UpdateProposalRequest,
      });
    } else {
      createMutation.mutate({ ...formData, title, totalValue } as CreateProposalRequest);
    }
  };

  if (loading) return <div className="p-8 text-center bg-zinc-50 min-h-screen pt-20">Loading modern builder...</div>;

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-24">
      <ProposalToolbar sticky>
        <ToolbarLeft className="gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/proposals`)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <BrandLogo className="h-10 w-auto md:h-12" />
            <div className="h-8 w-px bg-zinc-200" />
            <div>
              <h1 className="text-xl font-black text-zinc-900 tracking-tight">Proposal Builder</h1>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest leading-none mt-1">Growth OS for Marketing Agencies</p>
            </div>
          </div>
        </ToolbarLeft>
        <ToolbarRight>
           <Button variant="outline" className="rounded-full px-6 border-zinc-200" onClick={handleSave} disabled={saving}>
             {saving ? 'Saving...' : 'Save Draft'}
           </Button>
           <Button  onClick={() => navigate(`${basePath}/proposals/preview/${id}`)} disabled={!id}>
             <Eye className="w-4 h-4 mr-2" />
             Live Preview
           </Button>
        </ToolbarRight>
      </ProposalToolbar>

      {/* Stepper */}
      <div className="max-w-5xl mx-auto mt-10 px-4 mb-12">
        <div className="flex items-center justify-between relative">
          {/* Background line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-zinc-100 via-zinc-100 to-zinc-100 -z-10" />

          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center gap-3 relative z-10 flex-1 group">
              <motion.div
                initial={false}
                animate={{
                  scale: currentStep === idx ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 shadow-sm",
                  currentStep === idx
                    ? "bg-gradient-to-br from-brand to-pink-600 text-white shadow-lg shadow-brand/30 ring-4 ring-brand/20"
                    : currentStep > idx
                      ? "bg-zinc-900 text-white shadow-md"
                      : "bg-white border-2 border-zinc-200 text-zinc-400 group-hover:border-brand/40 group-hover:shadow-md"
                )}
              >
                {currentStep > idx ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <step.icon className="w-6 h-6" />
                )}
              </motion.div>

              <div className="text-center min-w-max">
                <span className={cn(
                  "text-xs font-black uppercase tracking-wider leading-tight block transition-colors duration-300",
                  currentStep === idx
                    ? "text-brand"
                    : currentStep > idx
                      ? "text-zinc-700"
                      : "text-zinc-500 group-hover:text-brand/60"
                )}>
                  {step.title}
                </span>
              </div>

              {/* Progress line between steps */}
              {idx < STEPS.length - 1 && (
                <motion.div
                  className={cn(
                    "absolute top-6 left-[calc(50%+24px)] w-[calc(100%+8px)] h-1 rounded-full -z-10",
                    currentStep > idx
                      ? "bg-gradient-to-r from-zinc-900 to-zinc-700"
                      : "bg-zinc-200"
                  )}
                  initial={false}
                  animate={{
                    background: currentStep > idx
                      ? "linear-gradient(to right, #18181b, #a1a1aa)"
                      : "rgb(229, 229, 229)"
                  }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

        {/* Form Body */}
        <div className="max-w-3xl mx-auto pb-20">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                   <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Client Foundation</h2>
                   <p className="text-zinc-500 text-sm">Tell us who we are growing today</p>
                </div>

                <Card className="border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Client Name</Label>
                        <div className="relative">
                          <Input
                            value={formData.clientName}
                            onChange={e => {
                              updateFormData({ clientName: e.target.value });
                              setClientQ(e.target.value);
                            }}
                            placeholder="e.g. John Smith"
                            className="h-12 border-zinc-200 focus:ring-brand rounded-xl font-bold"
                          />
                          {clientSearchQuery.data && clientSearchQuery.data.length > 0 && clientQ.length >= 2 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg z-50"
                            >
                              {clientSearchQuery.data.slice(0, 5).map((client) => (
                                <div
                                  key={client.id}
                                  onClick={() => {
                                    updateFormData({
                                      clientName: client.name,
                                      clientEmail: client.email,
                                      businessName: client.company || formData.businessName,
                                    });
                                    setClientQ('');
                                  }}
                                  className="p-3 border-b border-zinc-100 last:border-b-0 cursor-pointer hover:bg-zinc-50 transition-colors"
                                >
                                  <p className="text-sm font-bold text-zinc-900">{client.name}</p>
                                  <p className="text-xs text-zinc-500">{client.email}</p>
                                  {client.company && <p className="text-xs text-zinc-400">{client.company}</p>}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Business Name</Label>
                        <Input 
                          value={formData.businessName} 
                          onChange={e => updateFormData({ businessName: e.target.value })} 
                          placeholder="e.g. Magnetic World"
                          className="h-12 border-zinc-200 focus:ring-brand rounded-xl font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Client Email</Label>
                      <Input 
                        value={formData.clientEmail} 
                        onChange={e => updateFormData({ clientEmail: e.target.value })} 
                        placeholder="client@growth.com"
                        className="h-12 border-zinc-200 focus:ring-brand rounded-xl font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Industry</Label>
                        <div className="space-y-3">
                          <select 
                            className="w-full h-12 border border-zinc-200 px-4 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none bg-white"
                            value={isCustomIndustry ? 'Other (Custom)' : formData.industry}
                            onChange={e => {
                              if (e.target.value === 'Other (Custom)') {
                                setIsCustomIndustry(true);
                                updateFormData({ industry: '' });
                              } else {
                                setIsCustomIndustry(false);
                                updateFormData({ industry: e.target.value });
                              }
                            }}
                          >
                            <option value="">Select Industry</option>
                            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                          </select>
                          
                          {isCustomIndustry && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                              <Input 
                                value={formData.industry} 
                                onChange={e => updateFormData({ industry: e.target.value })} 
                                placeholder="Type your custom industry..."
                                className="h-12 border-brand focus:ring-brand rounded-xl font-bold italic"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Location</Label>
                        <Input 
                          value={formData.location} 
                          onChange={e => updateFormData({ location: e.target.value })} 
                          placeholder="e.g. Halifax, Canada"
                          className="h-12 border-zinc-200 focus:ring-brand rounded-xl font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Brief Business Description</Label>
                      <Textarea 
                        value={formData.businessDescription} 
                        onChange={e => updateFormData({ businessDescription: e.target.value })} 
                        placeholder="What do they actually do? (Service, product, pricing model)"
                        className="min-h-[120px] border-zinc-200 focus:ring-brand rounded-xl font-bold"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                 <div className="text-center mb-10">
                   <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Growth Strategy</h2>
                   <p className="text-zinc-500 text-sm mt-2">Select the services you'll provide</p>
                </div>

                {/* Service Options Grid */}
                <div>
                  <Label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-6">Core Services</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    {SERVICE_OPTIONS.map((s, idx) => {
                      const isSelected = formData.services?.includes(s.label);
                      return (
                        <motion.button
                          key={s.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => toggleService(s.label)}
                          className={cn(
                            "relative p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center group overflow-hidden",
                            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent before:to-transparent before:opacity-0 before:transition-opacity before:duration-300",
                            isSelected
                              ? "border-brand bg-gradient-to-br from-brand/8 to-brand/3 shadow-lg shadow-brand/20 before:from-brand/15 before:to-brand/5 before:opacity-100"
                              : "border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-brand/50 before:from-zinc-50 before:to-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative z-10",
                            isSelected
                              ? "bg-gradient-to-br from-brand to-pink-600 text-white shadow-lg shadow-brand/30"
                              : "bg-zinc-100 text-zinc-500 group-hover:bg-brand/10 group-hover:text-brand group-hover:shadow-md"
                          )}>
                            <s.icon className="w-7 h-7" />
                          </div>
                          <span className={cn(
                            "text-[11px] font-black uppercase tracking-wider leading-tight relative z-10 transition-colors",
                            isSelected ? "text-brand" : "text-zinc-600 group-hover:text-brand"
                          )}>
                            {s.label}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-3 right-3 z-20 bg-brand text-white rounded-full p-1 shadow-lg shadow-brand/30"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Growth Goals and Other Info Card */}
                <Card className="border-zinc-200 shadow-sm rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-50/50 to-white">
                  <CardContent className="p-8 space-y-8">
                    {/* Growth Goals */}
                    <div className="space-y-5">
                      <div>
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-4">Growth Goals</Label>
                        <p className="text-xs text-zinc-500 mb-4">Select multiple goals to focus on</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {GROWTH_GOALS.map((goal, idx) => {
                          const isSelected = (formData.goals as string[])?.includes(goal);
                          return (
                            <motion.button
                              key={goal}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              onClick={() => toggleGoal(goal)}
                              className={cn(
                                "px-6 py-3 rounded-full border-2 font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap",
                                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:to-transparent before:opacity-0 before:transition-opacity before:rounded-full",
                                isSelected
                                  ? "border-brand bg-gradient-to-r from-brand to-pink-600 text-white shadow-lg shadow-brand/25 before:from-white/20 before:to-transparent before:opacity-30"
                                  : "border-zinc-300 bg-white text-zinc-700 hover:border-brand/60 hover:shadow-md hover:bg-zinc-50"
                              )}
                            >
                              {isSelected && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                  <CheckCircle2 className="w-4 h-4" />
                                </motion.div>
                              )}
                              <span>{goal}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

                    {/* Target Audience */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-2">Target Audience Profiles</Label>
                        <p className="text-xs text-zinc-500 mb-3">Describe your ideal customer</p>
                      </div>
                      <Textarea
                        value={formData.targetAudience || ''}
                        onChange={e => updateFormData({ targetAudience: e.target.value })}
                        placeholder="Age, location, interests, pain points, behaviors..."
                        className="min-h-[110px] border-zinc-200 focus:ring-brand rounded-2xl font-medium text-zinc-700 bg-white/50"
                      />
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

                    {/* Budget */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-2">Monthly Ad Spend Budget</Label>
                        <p className="text-xs text-zinc-500 mb-3">Estimated budget for advertising</p>
                      </div>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <Input
                          type="number"
                          value={formData.monthlyBudget ?? 2500}
                          onChange={e => updateFormData({ monthlyBudget: Number(e.target.value) })}
                          className="pl-12 h-12 border-zinc-200 focus:ring-brand rounded-2xl font-bold text-lg text-zinc-900 bg-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                 <div className="text-center mb-8">
                   <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Investment Models</h2>
                   <p className="text-zinc-500 text-sm">Select one package to include in your proposal</p>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 ">
                  {availablePackages.map((p, idx) => {
                    const isSelected = !!formData.pricingPlans?.find(plan => plan.id === p.id);
                    const isPopular = p.id === 'standard';

                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => togglePricingPlan(p)}
                        className="h-full cursor-pointer"
                      >
                        <Card
                          className={cn(
                            "relative border-[1px] w-full transition-all duration-300 rounded-xl overflow-hidden group h-full flex flex-col",
                            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent before:to-transparent before:opacity-0 before:transition-opacity before:duration-300",
                            isSelected
                              ? "border-brand bg-gradient-to-br from-brand/5 to-brand/2 shadow-2xl shadow-brand/20 before:from-brand/10 before:to-brand/5 before:opacity-100"
                              : "border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-brand/40 before:from-zinc-50 before:to-transparent before:opacity-0"
                          )}
                        >
                          {isPopular && !isSelected && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                              <Badge className="bg-brand/10 text-brand border-brand/30 font-bold text-[11px] uppercase tracking-wider px-3 py-1">
                                Most Popular
                              </Badge>
                            </div>
                          )}

                          <div className="relative z-10 flex-1 flex flex-col p-8">
                            <div className="flex items-center justify-between mb-6">
                              <Input
                                onClick={e => e.stopPropagation()}
                                value={p.label}
                                onChange={e => updatePackageDraft(p.id, { label: e.target.value })}
                                className="text-sm font-black uppercase tracking-[0.15em] text-zinc-600 border-none p-0 h-auto focus-visible:ring-0 bg-transparent w-3/4"
                              />
                              <div
                                onClick={e => {
                                  e.stopPropagation();
                                  togglePricingPlan(p);
                                }}
                                className={cn(
                                  "w-6  h-6 rounded-full border-2 hidden items-center justify-center transition-all flex-shrink-0",
                                  isSelected
                                    ? "bg-brand border-brand text-white shadow-lg shadow-brand/30"
                                    : "border-zinc-300 text-transparent hover:border-brand"
                                )}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            </div>

                            <div className="mb-8">
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-zinc-900">$</span>
                                <Input
                                  onClick={e => e.stopPropagation()}
                                  type="number"
                                  value={p.price}
                                  onChange={e => updatePackageDraft(p.id, { price: Number(e.target.value) })}
                                  className="text-4xl font-black text-zinc-900 tracking-tighter border-none p-0 h-auto focus-visible:ring-0 bg-transparent w-24"
                                />
                                <span className="text-sm font-bold text-zinc-500">/mo</span>
                              </div>
                              <p className="text-xs text-zinc-500 font-bold mt-2 uppercase tracking-wider">per month</p>
                            </div>

                            <div className="space-y-3 flex-1">
                              <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">What's Included</div>
                              <div className="space-y-2.5">
                                {p.features.map((f, fi) => (
                                  <div
                                    key={fi}
                                    onClick={e => e.stopPropagation()}
                                    className="flex items-start gap-3 group/item"
                                  >
                                    <div className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                                      isSelected ? "bg-brand/10" : "bg-zinc-100"
                                    )}>
                                      <CheckCircle2 className={cn(
                                        "w-4 h-4",
                                        isSelected ? "text-brand" : "text-zinc-300"
                                      )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <Input
                                        value={f}
                                        onChange={e => updateFeature(p.id, fi, e.target.value)}
                                        className="text-sm font-bold text-zinc-700 border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                                      />
                                    </div>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        removeFeature(p.id, fi);
                                      }}
                                      className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-red-500 transition-all flex-shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <Button
                              onClick={e => {
                                e.stopPropagation();
                                addFeature(p.id);
                              }}
                              variant="ghost"
                              size="sm"
                              className="w-full mt-6 border border-dashed border-zinc-200 text-zinc-500 hover:text-brand hover:border-brand hover:bg-zinc-50 rounded-xl h-9 text-[11px] font-bold uppercase transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Item
                            </Button>
                          </div>

                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-4 right-4 z-20 bg-brand text-white rounded-full p-2 shadow-lg shadow-brand/30"
                            >
                              <BadgeCheck className="w-5 h-5" />
                            </motion.div>
                          )}
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                    <Button
                      onClick={() => {
                        const newId = `custom-${Date.now()}`;
                        const newPkg = { id: newId, label: 'Custom', price: 2000, features: ['Core Deliverable 1'] };
                        setAvailablePackages([...availablePackages, newPkg]);
                      }}
                      variant="outline"
                      className="border-zinc-300 rounded-2xl px-8 h-11 font-bold tracking-tight hover:bg-zinc-50"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Create Custom Package
                    </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
        

                <div className="flex flex-col items-center justify-center py-20 gap-8">
                   <div className="relative">
                      <div className="w-32 h-32 rounded-2xl bg-brand/10 flex items-center justify-center animate-pulse">
                         <Sparkles className="w-16 h-16 text-brand" />
                      </div>
                      <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center shadow-lg border-4 border-white">
                         <Rocket className="w-5 h-5 text-white" />
                      </div>
                   </div>

                   <div className="max-w-md text-center space-y-4">
                      <h3 className="text-xl font-bold text-zinc-900">Ready to Generate?</h3>
                      <p className="text-zinc-500 text-sm">Our AI will create sections, strategies, and CTAs in the OP Media style.</p>
                   </div>

                   <Button
                     size="lg"
                     
                     onClick={handleGenerateAI}
                     disabled={generating}
                   >
                     {generating ? (
                       <>
                         <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-3" />
                         Crafting Proposal...
                       </>
                     ) : (
                       <>
                        
                         GENERATE AI PROPOSAL
                       </>
                     )}
                   </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                 <div className="text-center mb-8">
                   <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Final Review</h2>
                   <p className="text-zinc-500 text-sm">Polish and finalize your proposal</p>
                </div>

                <div className="space-y-6">
                   {formData.sections?.map((section, idx) => (
                     <div key={idx} className="group relative bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:border-brand/40 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                           <h4 className="text-lg font-bold text-zinc-900 tracking-tight">{section.title}</h4>
                           <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{String(idx + 1).padStart(2, '0')}</div>
                        </div>
                        <Textarea 
                          value={section.content}
                          onChange={e => {
                            const newSections = [...(formData.sections || [])];
                            newSections[idx].content = e.target.value;
                            updateFormData({ sections: newSections });
                          }}
                          className="min-h-[200px] bg-zinc-50/50 border-zinc-100 rounded-2xl italic font-bold p-6 focus:ring-brand text-zinc-700 leading-relaxed"
                        />
                     </div>
                   ))}
                </div>

                <div className="flex justify-center pt-6">
                   <Button
                    size="lg"
                    className="h-12 px-12 bg-brand text-white border-none shadow-lg shadow-brand/20 font-bold rounded-lg hover:scale-105 active:scale-95 transition-transform"
                    onClick={handleSave}
                    disabled={saving}
                   >
                     {saving ? 'FINISHING...' : 'Save & Preview'}
                   </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Persistent Footer Controls */}
          <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-zinc-200 py-3 z-[99]">
             <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
                <Button
                  variant="ghost"
                  className={cn("h-10 rounded-lg font-bold border border-zinc-200 px-4 text-sm", currentStep === 0 && "opacity-0")}
                  onClick={handleBack}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>

                <div className="text-zinc-400 text-xs font-black tracking-widest px-4">
                   STEP {currentStep + 1} / {STEPS.length}
                </div>

                {currentStep < STEPS.length - 1 ? (
                  <Button
                   
                    onClick={handleNext}
                    disabled={currentStep === 3 && !formData.sections?.length}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                   
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Completing...' : 'Finish'}
                  </Button>
                )}
             </div>
          </div>
        </div>
    </div>
  );
};
