import { useEffect, useRef } from 'react';
import { TOUR_STEPS } from '../../hooks/useTour';

interface TourOverlayProps {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

const CARD_WIDTH = 320;
const CARD_H_ESTIMATE = 210;
const PAD = 12;
const OFFSET = 12;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function TourOverlay({ step, onNext, onPrev, onClose }: TourOverlayProps) {
  const stepData = TOUR_STEPS[step];
  const totalSteps = TOUR_STEPS.length;
  const isLast = step === totalSteps - 1;
  const isFirst = step === 0;

  const highlightRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll target into view and position highlight + card
  useEffect(() => {
    const target = stepData.target;
    if (!target) {
      if (highlightRef.current) highlightRef.current.style.display = 'none';
      if (cardRef.current) {
        const card = cardRef.current;
        card.style.position = 'fixed';
        card.style.top = '50%';
        card.style.left = '50%';
        card.style.transform = 'translate(-50%, -50%)';
        card.style.width = `${CARD_WIDTH}px`;
      }
      return;
    }

    const el = document.querySelector<HTMLElement>(target);
    if (!el) {
      // Graceful degradation: center the card
      if (highlightRef.current) highlightRef.current.style.display = 'none';
      if (cardRef.current) {
        const card = cardRef.current;
        card.style.position = 'fixed';
        card.style.top = '50%';
        card.style.left = '50%';
        card.style.transform = 'translate(-50%, -50%)';
        card.style.width = `${CARD_WIDTH}px`;
      }
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Give scroll a moment to settle before measuring
    const timer = setTimeout(() => {
      const rect = el.getBoundingClientRect();

      // Position highlight ring
      if (highlightRef.current) {
        const h = highlightRef.current;
        h.style.display = 'block';
        h.style.position = 'fixed';
        h.style.top = `${rect.top - 6}px`;
        h.style.left = `${rect.left - 6}px`;
        h.style.width = `${rect.width + 12}px`;
        h.style.height = `${rect.height + 12}px`;
      }

      // Position card
      if (cardRef.current) {
        const card = cardRef.current;
        card.style.transform = '';

        let left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
        left = clamp(left, PAD, window.innerWidth - CARD_WIDTH - PAD);

        const placeAbove =
          window.innerHeight - rect.bottom - OFFSET < CARD_H_ESTIMATE &&
          rect.top > CARD_H_ESTIMATE;
        const top = placeAbove
          ? rect.top - CARD_H_ESTIMATE - OFFSET
          : rect.bottom + OFFSET;

        card.style.position = 'fixed';
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        card.style.width = `${CARD_WIDTH}px`;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [stepData.target]);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isCentered = !stepData.target;

  return (
    <>
      {/* Backdrop — semi-opaque for centered steps, transparent for targeted (vignette from highlight shadow) */}
      <div
        className="fixed inset-0 z-[70]"
        style={{ backgroundColor: isCentered ? 'rgba(0,0,0,0.6)' : 'transparent' }}
        onClick={onClose}
      />

      {/* Spotlight highlight ring */}
      <div
        ref={highlightRef}
        className="pointer-events-none rounded-md z-[71]"
        style={{
          display: isCentered ? 'none' : 'block',
          position: 'fixed',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 2px #c8f55a, 0 0 16px 4px #c8f55a44',
        }}
      />

      {/* Card */}
      <div
        ref={cardRef}
        className="z-[72] rounded-lg border border-[#444] bg-[#1a1a1e] p-4 shadow-2xl"
        style={{ position: 'fixed', width: CARD_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step counter */}
        <div className="mb-2 text-[10px] uppercase tracking-wider text-[#555]">
          {step + 1} / {totalSteps}
        </div>

        {/* Title */}
        <p className="mb-1.5 text-sm font-semibold text-[#e0e0e0]">{stepData.title}</p>

        {/* Body */}
        <p className="mb-4 text-xs leading-relaxed text-[#888]">{stepData.body}</p>

        {/* Progress dots */}
        <div className="mb-4 flex items-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={[
                'h-1.5 rounded-full bg-[#c8f55a] transition-all duration-200',
                i === step ? 'w-4 opacity-100' : 'w-1.5 opacity-30',
              ].join(' ')}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="text-xs text-[#555] hover:text-[#888] transition-colors cursor-pointer"
          >
            Skip
          </button>

          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={onPrev}
                className="rounded border border-[#333] bg-[#111] px-3 py-1.5 text-xs text-[#888] hover:text-[#ccc] transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="rounded border border-[#c8f55a]/50 bg-[#c8f55a]/10 px-3 py-1.5 text-xs font-semibold text-[#c8f55a] hover:bg-[#c8f55a]/20 transition-colors cursor-pointer"
            >
              {isLast ? 'Finish' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
