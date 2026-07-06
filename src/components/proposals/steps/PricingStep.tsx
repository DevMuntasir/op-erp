import React from 'react';
import { Proposal } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CheckCircle2, BadgeCheck } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const PRICING_PACKAGES = [
  { id: 'basic', label: 'Basic', price: 1500, features: ['3 Social Posts/week', 'Small Ad Budget Management', 'Monthly Report'] },
  { id: 'standard', label: 'Standard', price: 3500, features: ['Daily Posts', 'Medium Ad Budget', 'Content Creation (4 Videos)', 'Fortnightly Strategy Calls'] },
  { id: 'premium', label: 'Premium', price: 7500, features: ['Multi-channel Ads', 'Full Scale SEO', '8-12 Videos/mo', 'Dedicated Account Manager'] },
];

interface PackageData {
  id: string;
  label: string;
  price: number;
  features: string[];
}

interface PricingStepProps {
  formData: Partial<Proposal>;
  onUpdate: (updates: Partial<Proposal>) => void;
}

const PricingCard = React.memo(({
  pkg,
  isSelected,
  idx,
  onToggle,
  onPriceChange,
  onLabelChange,
  onAddFeature,
  onRemoveFeature,
  onFeatureChange,
}: {
  pkg: PackageData;
  isSelected: boolean;
  idx: number;
  onToggle: () => void;
  onPriceChange: (price: number) => void;
  onLabelChange: (label: string) => void;
  onAddFeature: () => void;
  onRemoveFeature: (index: number) => void;
  onFeatureChange: (index: number, value: string) => void;
}) => {
  const isPopular = pkg.id === 'standard';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      onClick={onToggle}
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
              value={pkg.label}
              onChange={e => onLabelChange(e.target.value)}
              className="text-sm font-black uppercase tracking-[0.15em] text-zinc-600 border-none p-0 h-auto focus-visible:ring-0 bg-transparent w-3/4"
            />
            {/* <div
              onClick={e => {
                e.stopPropagation();
                onToggle();
              }}
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                isSelected
                  ? "bg-brand border-brand text-white shadow-lg shadow-brand/30"
                  : "border-zinc-300 text-transparent hover:border-brand"
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div> */}
          </div>

          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-zinc-900">$</span>
              <Input
                onClick={e => e.stopPropagation()}
                type="number"
                value={pkg.price}
                onChange={e => onPriceChange(Number(e.target.value))}
                className="text-4xl font-black text-zinc-900 tracking-tighter border-none p-0 h-auto focus-visible:ring-0 bg-transparent w-24"
              />
              <span className="text-sm font-bold text-zinc-500">/mo</span>
            </div>
            <p className="text-xs text-zinc-500 font-bold mt-2 uppercase tracking-wider">per month</p>
          </div>

          <div className="space-y-3 flex-1">
            <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">What's Included</div>
            <div className="space-y-2.5">
              {pkg.features.map((f, fi) => (
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
                      onChange={e => onFeatureChange(fi, e.target.value)}
                      className="text-sm font-bold text-zinc-700 border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                    />
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRemoveFeature(fi);
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
              onAddFeature();
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
});

PricingCard.displayName = 'PricingCard';

export const PricingStep = React.memo(({ formData, onUpdate }: PricingStepProps) => {
  const [availablePackages, setAvailablePackages] = React.useState<PackageData[]>(PRICING_PACKAGES);

  React.useEffect(() => {
    if (formData.pricingPlans && formData.pricingPlans.length > 0) {
      const stored = formData.pricingPlans.map(p => ({
        id: p.id,
        label: p.label,
        price: p.value,
        features: [...(p.items ?? [])]
      }));
      setAvailablePackages(prev => {
        const merged = prev.map(p => stored.find(s => s.id === p.id) ?? p);
        const missing = stored.filter(s => !prev.find(p => p.id === s.id));
        return [...merged, ...missing];
      });
    }
  }, [formData.pricingPlans]);

  const togglePricingPlan = (pkg: PackageData) => {
    const exists = formData.pricingPlans?.find(p => p.id === pkg.id);
    if (exists) {
      onUpdate({ pricingPlans: [] });
    } else {
      onUpdate({
        pricingPlans: [{
          id: pkg.id,
          label: pkg.label,
          value: pkg.price,
          items: [...pkg.features]
        }]
      });
    }
  };

  const updatePackageDraft = (id: string, updates: Partial<PackageData>) => {
    setAvailablePackages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

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
      onUpdate({ pricingPlans: selected });
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Investment Models</h2>
        <p className="text-zinc-500 text-sm">Select one package to include in your proposal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {availablePackages.map((p, idx) => (
          <PricingCard
            key={p.id}
            pkg={p}
            isSelected={!!formData.pricingPlans?.find(plan => plan.id === p.id)}
            idx={idx}
            onToggle={() => togglePricingPlan(p)}
            onPriceChange={(price) => updatePackageDraft(p.id, { price })}
            onLabelChange={(label) => updatePackageDraft(p.id, { label })}
            onAddFeature={() => addFeature(p.id)}
            onRemoveFeature={(index) => removeFeature(p.id, index)}
            onFeatureChange={(index, value) => updateFeature(p.id, index, value)}
          />
        ))}
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
  );
});

PricingStep.displayName = 'PricingStep';
