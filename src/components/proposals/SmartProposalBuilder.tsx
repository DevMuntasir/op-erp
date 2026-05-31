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
    const current = formData.pricingPlans || [];
    const exists = current.find(p => p.id === pkg.id);
    
    if (exists) {
      updateFormData({ pricingPlans: current.filter(p => p.id !== pkg.id) });
    } else {
      updateFormData({ 
        pricingPlans: [...current, { 
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
           <Button className="bg-brand text-white hover:bg-brand/90 rounded-full px-6 shadow-lg shadow-brand/20 border-none" onClick={() => navigate(`${basePath}/proposals/preview/${id}`)} disabled={!id}>
             <Eye className="w-4 h-4 mr-2" />
             Live Preview
           </Button>
        </ToolbarRight>
      </ProposalToolbar>

      {/* Stepper */}
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <div className="flex items-center justify-between mb-12">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center gap-2 relative z-10 flex-1">
               <div className={cn(
                 "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
                 currentStep === idx ? "bg-brand text-white shadow-lg shadow-brand/20 scale-110" :
                 currentStep > idx ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-400"
               )}>
                 <step.icon className="w-5 h-5" />
               </div>
               <span className={cn(
                 "text-[10px] font-black uppercase tracking-tighter text-center",
                 currentStep === idx ? "text-brand" : "text-zinc-400"
               )}>{step.title}</span>
               {idx < STEPS.length - 1 && (
                 <div className={cn(
                   "absolute top-5 left-[calc(50%+20px)] right-0 h-[2px] -z-10",
                   currentStep > idx ? "bg-zinc-900" : "bg-zinc-100"
                 )} />
               )}
            </div>
          ))}
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
                className="space-y-6"
              >
                 <div className="text-center mb-8">
                   <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Growth Strategy</h2>
                   <p className="text-zinc-500 text-sm">Building the machine for results</p>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {SERVICE_OPTIONS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => toggleService(s.label)}
                        className={cn(
                          "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center group relative overflow-hidden",
                          formData.services?.includes(s.label)
                            ? "border-brand bg-brand/5 shadow-md"
                            : "border-zinc-100 bg-white hover:border-brand/40"
                        )}
                      >
                         <div className={cn(
                           "w-12 h-12 rounded-2xl flex items-center justify-center mb-1",
                           formData.services?.includes(s.label) ? "bg-brand text-white" : "bg-zinc-50 text-zinc-400 group-hover:bg-brand/10 group-hover:text-brand"
                         )}>
                           <s.icon className="w-6 h-6" />
                         </div>
                         <span className={cn(
                           "text-[10px] font-black uppercase tracking-widest leading-tight",
                           formData.services?.includes(s.label) ? "text-brand" : "text-zinc-500"
                         )}>{s.label}</span>
                         {formData.services?.includes(s.label) && (
                           <div className="absolute top-2 right-2">
                             <CheckCircle2 className="w-5 h-5 text-brand" />
                           </div>
                         )}
                      </button>
                    ))}
                  </div>

                  <Card className="border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4">
                           <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Growth Goals</Label>
                           <div className="flex flex-wrap gap-2">
                             {GROWTH_GOALS.map(goal => {
                               const isSelected = (formData.goals as string[])?.includes(goal);
                               return (
                                 <button
                                   key={goal}
                                   onClick={() => toggleGoal(goal)}
                                   className={cn(
                                     "px-5 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all flex items-center gap-2",
                                     isSelected 
                                       ? "border-brand bg-brand text-white shadow-lg shadow-brand/20" 
                                       : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-brand/40"
                                   )}
                                 >
                                   {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                   {goal}
                                 </button>
                               );
                             })}
                           </div>
                        </div>
                       
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Target Audience Profiles</Label>
                          <Textarea 
                            value={formData.targetAudience} 
                            onChange={e => updateFormData({ targetAudience: e.target.value })} 
                            placeholder="Who are we hunting? Age, location, interests, behaviors..."
                            className="min-h-[100px] border-zinc-200 focus:ring-brand rounded-xl font-bold"
                          />
                       </div>

                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Estimated Monthly Ad Spend/Budget</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input 
                              type="number"
                              value={formData.monthlyBudget} 
                              onChange={e => updateFormData({ monthlyBudget: Number(e.target.value) })} 
                              className="pl-10 h-12 border-zinc-200 focus:ring-brand rounded-xl font-bold"
                            />
                          </div>
                       </div>
                    </CardContent>
                  </Card>
                </div>
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
                   <p className="text-zinc-500 text-sm">Packages designed to convert</p>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {availablePackages.map(p => {
                    const isSelected = !!formData.pricingPlans?.find(plan => plan.id === p.id);
                    return (
                      <Card
                        key={p.id}
                        className={cn(
                          "relative border-2 transition-all rounded-2xl overflow-hidden group bg-white",
                          isSelected ? "border-brand shadow-lg scale-105 z-10" : "border-zinc-100 hover:border-brand/20 shadow-sm"
                        )}
                      >
                         <div className="p-5 pb-3">
                            <div className="flex items-center justify-between mb-3">
                              <Input 
                                value={p.label}
                                onChange={e => updatePackageDraft(p.id, { label: e.target.value })}
                                className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 border-none p-0 h-auto focus-visible:ring-0 bg-transparent w-2/3"
                              />
                               <button 
                                onClick={() => togglePricingPlan(p)}
                                className={cn(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  isSelected ? "bg-brand border-brand text-white" : "border-zinc-200 text-transparent"
                                )}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 overflow-hidden">
                               <span className="text-lg font-black text-zinc-400">$</span>
                               <Input 
                                type="number"
                                value={p.price}
                                onChange={e => updatePackageDraft(p.id, { price: Number(e.target.value) })}
                                className="text-2xl font-black text-zinc-900 tracking-tighter border-none p-0 h-auto focus-visible:ring-0 bg-transparent w-full"
                               />
                               <span className="text-sm font-bold text-zinc-400 shrink-0">/mo</span>
                            </div>
                         </div>
                         
                         <div className="px-5 pb-5 pt-3 space-y-2">
                            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Deliverables</div>
                            {p.features.map((f, fi) => (
                              <div key={fi} className="flex items-center gap-3 group/item">
                                 <CheckCircle2 className={cn("w-4 h-4 shrink-0", isSelected ? "text-brand" : "text-zinc-300")} />
                                 <Input 
                                  value={f}
                                  onChange={e => updateFeature(p.id, fi, e.target.value)}
                                  className="text-xs font-bold text-zinc-600 border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                                 />
                                 <button 
                                  onClick={() => removeFeature(p.id, fi)}
                                  className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-red-500 transition-all"
                                 >
                                  <Trash2 className="w-3 h-3" />
                                 </button>
                              </div>
                            ))}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-2 border border-dashed border-zinc-200 text-zinc-400 hover:text-brand hover:border-brand rounded-xl h-8 text-[10px] font-black uppercase"
                              onClick={() => addFeature(p.id)}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add Deliverable
                            </Button>
                         </div>

                         {isSelected && (
                           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2">
                              <div className="bg-brand text-white text-[8px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full shadow-lg shadow-brand/20 flex items-center gap-1.5">
                                <BadgeCheck className="w-3 h-3" /> Included
                              </div>
                           </div>
                         )}
                      </Card>
                    );
                  })}
                </div>

                <div className="flex justify-center mt-12 mb-6">
                    <Button 
                      onClick={() => {
                        const newId = `custom-${Date.now()}`;
                        const newPkg = { id: newId, label: 'Custom Service', price: 2000, features: ['Core Deliverable 1'] };
                        setAvailablePackages([...availablePackages, newPkg]);
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl px-8 h-12 font-black italic tracking-tight shadow-xl"
                    >
                      <Plus className="w-5 h-5 mr-2" /> Add Bespoke Model
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
                 <div className="text-center mb-8">
                   <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">AI Magic</h2>
                   <p className="text-zinc-500 text-sm">Generate high-impact agency content</p>
                </div>

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
                     className="h-12 px-12 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg shadow-lg border-none font-bold scale-100 hover:scale-105 active:scale-95 transition-all"
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
                         <Sparkles className="w-5 h-5 mr-3" />
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
                    className="h-10 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg font-bold px-6 text-sm"
                    onClick={handleNext}
                    disabled={currentStep === 3 && !formData.sections?.length}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    className="h-10 bg-brand text-white hover:bg-brand/90 rounded-lg font-bold px-6 shadow-lg shadow-brand/20 border-none text-sm"
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
    </div>
  );
};
