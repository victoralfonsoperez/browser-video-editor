import { useReducer } from 'react';

export const TOUR_KEY = 'tour-seen';

export interface TourStep {
  title: string;
  body: string;
  target: string | null; // CSS selector or null for centered step
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Video Editor Tour',
    body: "Let's take 30 seconds to learn the key features.",
    target: null,
  },
  {
    title: 'Timeline & Trim Markers',
    body: 'Drag the green marker to set the start (In point) and the red marker for the end (Out point). Press I / O on your keyboard for the same effect.',
    target: '[data-tour="timeline"]',
  },
  {
    title: 'Save as a Clip',
    body: "Once your in/out points are set, name the selection and click 'Add Clip' to save it with a thumbnail.",
    target: '[data-tour="add-clip"]',
  },
  {
    title: 'Export Your Clips',
    body: '⬇ downloads instantly. + adds to the export queue for batch processing. ⚙ per-clip settings for format, quality, and resolution.',
    target: '[data-tour="clip-list"]',
  },
  {
    title: "You're all set!",
    body: 'Shortcuts: I / O set markers · Space play/pause · ← → frame step. Click ? anytime to replay this tour.',
    target: null,
  },
];

const LAST_STEP = TOUR_STEPS.length - 1;

interface TourState {
  isOpen: boolean;
  step: number;
}

type TourAction = { type: 'start' } | { type: 'next' } | { type: 'prev' } | { type: 'close' };

const initial: TourState = { isOpen: false, step: 0 };

function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case 'start':
      return { isOpen: true, step: 0 };
    case 'next':
      return state.step >= LAST_STEP
        ? { isOpen: false, step: 0 }
        : { ...state, step: state.step + 1 };
    case 'prev':
      return { ...state, step: Math.max(0, state.step - 1) };
    case 'close':
      return { isOpen: false, step: 0 };
  }
}

export function useTour() {
  const [tourState, dispatch] = useReducer(tourReducer, initial);

  const startTour = () => dispatch({ type: 'start' });

  const nextStep = () => {
    if (tourState.step >= LAST_STEP) localStorage.setItem(TOUR_KEY, '1');
    dispatch({ type: 'next' });
  };

  const prevStep = () => dispatch({ type: 'prev' });

  const closeTour = () => {
    localStorage.setItem(TOUR_KEY, '1');
    dispatch({ type: 'close' });
  };

  return { tourState, startTour, nextStep, prevStep, closeTour };
}
