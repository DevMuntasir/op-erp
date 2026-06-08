import React, { useMemo } from 'react';
import { Proposal } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, CheckCircle2, Target, Layout, Zap, Search, Palette, Magnet, Video, Share2, Filter, Bot, TrendingUp, Mail, PieChart } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion as motionLib, AnimatePresence } from 'motion/react';

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

interface ServicesStepProps {
  formData: Partial<Proposal>;
  onUpdate: (updates: Partial<Proposal>) => void;
}

const ServiceButton = React.memo(({
  service,
  isSelected,
  idx,
  onToggle
}: {
  service: typeof SERVICE_OPTIONS[0];
  isSelected: boolean;
  idx: number;
  onToggle: () => void;
}) => (
  <motionLib.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.05 }}
    onClick={onToggle}
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
      <service.icon className="w-7 h-7" />
    </div>
    <span className={cn(
      "text-[11px] font-black uppercase tracking-wider leading-tight relative z-10 transition-colors",
      isSelected ? "text-brand" : "text-zinc-600 group-hover:text-brand"
    )}>
      {service.label}
    </span>
    {isSelected && (
      <motionLib.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute top-3 right-3 z-20 bg-brand text-white rounded-full p-1 shadow-lg shadow-brand/30"
      >
        <CheckCircle2 className="w-4 h-4" />
      </motionLib.div>
    )}
  </motionLib.button>
));

ServiceButton.displayName = 'ServiceButton';

const GoalButton = React.memo(({
  goal,
  isSelected,
  idx,
  onToggle
}: {
  goal: string;
  isSelected: boolean;
  idx: number;
  onToggle: () => void;
}) => (
  <motionLib.button
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: idx * 0.05 }}
    onClick={onToggle}
    className={cn(
      "px-6 py-3 rounded-full border-2 font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap",
      "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:to-transparent before:opacity-0 before:transition-opacity before:rounded-full",
      isSelected
        ? "border-brand bg-gradient-to-r from-brand to-pink-600 text-white shadow-lg shadow-brand/25 before:from-white/20 before:to-transparent before:opacity-30"
        : "border-zinc-300 bg-white text-zinc-700 hover:border-brand/60 hover:shadow-md hover:bg-zinc-50"
    )}
  >
    {isSelected && (
      <motionLib.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
        <CheckCircle2 className="w-4 h-4" />
      </motionLib.div>
    )}
    <span>{goal}</span>
  </motionLib.button>
));

GoalButton.displayName = 'GoalButton';

export const ServicesStep = React.memo(({ formData, onUpdate }: ServicesStepProps) => {
  const toggleService = (service: string) => {
    const current = formData.services || [];
    if (current.includes(service)) {
      onUpdate({ services: current.filter(s => s !== service) });
    } else {
      onUpdate({ services: [...current, service] });
    }
  };

  const toggleGoal = (goal: string) => {
    const current = (formData.goals as string[]) || [];
    if (current.includes(goal)) {
      onUpdate({ goals: current.filter(g => g !== goal) });
    } else {
      onUpdate({ goals: [...current, goal] });
    }
  };

  const services = useMemo(() => formData.services || [], [formData.services]);
  const goals = useMemo(() => (formData.goals as string[]) || [], [formData.goals]);

  return (
    <motionLib.div
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

      <div>
        <Label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-6">Core Services</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {SERVICE_OPTIONS.map((s, idx) => (
            <ServiceButton
              key={s.id}
              service={s}
              isSelected={services.includes(s.label)}
              idx={idx}
              onToggle={() => toggleService(s.label)}
            />
          ))}
        </div>
      </div>

      <Card className="border-zinc-200 shadow-sm rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-50/50 to-white">
        <CardContent className="p-8 space-y-8">
          <div className="space-y-5">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-4">Growth Goals</Label>
              <p className="text-xs text-zinc-500 mb-4">Select multiple goals to focus on</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {GROWTH_GOALS.map((goal, idx) => (
                <GoalButton
                  key={goal}
                  goal={goal}
                  isSelected={goals.includes(goal)}
                  idx={idx}
                  onToggle={() => toggleGoal(goal)}
                />
              ))}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-2">Target Audience Profiles</Label>
              <p className="text-xs text-zinc-500 mb-3">Describe your ideal customer</p>
            </div>
            <Textarea
              value={formData.targetAudience || ''}
              onChange={e => onUpdate({ targetAudience: e.target.value })}
              placeholder="Age, location, interests, pain points, behaviors..."
              className="min-h-[110px] border-zinc-200 focus:ring-brand rounded-2xl font-medium text-zinc-700 bg-white/50"
            />
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-2">Monthly Ad Spend Budget</Label>
              <p className="text-xs text-zinc-500 mb-3">Estimated budget for advertising</p>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="number"
                value={formData.monthlyBudget ?? 2500}
                onChange={e => onUpdate({ monthlyBudget: Number(e.target.value) })}
                className="pl-12 h-12 w-full border border-zinc-200 focus:ring-2 focus:ring-brand rounded-2xl font-bold text-lg text-zinc-900 bg-white outline-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motionLib.div>
  );
});

ServicesStep.displayName = 'ServicesStep';
