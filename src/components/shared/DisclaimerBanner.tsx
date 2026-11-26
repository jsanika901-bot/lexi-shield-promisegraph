import { Info } from 'lucide-react';
import { PRELIMINARY_DISCLAIMER } from '../../data/presets';

interface DisclaimerBannerProps {
  compact?: boolean;
}

export function DisclaimerBanner({ compact = false }: DisclaimerBannerProps) {
  return (
    <div
      role="note"
      className={`rounded-xl border border-slate-800/90 bg-[#0A101D] text-slate-300 flex items-start gap-3 ${
        compact ? 'px-3.5 py-2.5 text-xs' : 'px-4 py-3.5 text-xs sm:text-sm'
      }`}
    >
      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="leading-relaxed text-slate-300">
        <span className="font-semibold text-white">Preliminary Verification Aid: </span>
        {PRELIMINARY_DISCLAIMER.replace(/^Preliminary verification aid only:\s*/i, '')}
      </p>
    </div>
  );
}
