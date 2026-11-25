import React from 'react';
import { DietaryType } from '@menuorbit/shared';

interface DietaryBadgeProps {
  type: DietaryType;
  showLabel?: boolean;
}

export function DietaryBadge({ type, showLabel = false }: DietaryBadgeProps) {
  const config = {
    veg: {
      border: 'border-emerald-600',
      dot: 'bg-emerald-600',
      text: 'text-emerald-700',
      label: 'Veg',
    },
    non_veg: {
      border: 'border-rose-600',
      dot: 'bg-rose-600',
      text: 'text-rose-700',
      label: 'Non-Veg',
    },
    egg: {
      border: 'border-amber-600',
      dot: 'bg-amber-600',
      text: 'text-amber-700',
      label: 'Egg',
    },
  }[type];

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0" title={config.label}>
      <span
        className={`h-4 w-4 rounded-xs border-2 ${config.border} flex items-center justify-center bg-white`}
      >
        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      </span>
      {showLabel && <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>}
    </span>
  );
}