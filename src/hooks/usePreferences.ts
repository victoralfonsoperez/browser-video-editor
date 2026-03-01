import { useReducer, useEffect } from 'react';
import type { ExportOptions } from '../types/exportOptions';
import { DEFAULT_EXPORT_OPTIONS, FORMATS, QUALITIES, RESOLUTIONS } from '../types/exportOptions';

const STORAGE_KEY = 'editor-preferences';

export interface Preferences {
  globalOptions: ExportOptions;
  showHighlightsOnTimeline: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  globalOptions: DEFAULT_EXPORT_OPTIONS,
  showHighlightsOnTimeline: true,
};

type Action =
  | { type: 'SET_GLOBAL_OPTIONS'; payload: ExportOptions }
  | { type: 'TOGGLE_HIGHLIGHTS_ON_TIMELINE' };

function reducer(state: Preferences, action: Action): Preferences {
  switch (action.type) {
    case 'SET_GLOBAL_OPTIONS':
      return { ...state, globalOptions: action.payload };
    case 'TOGGLE_HIGHLIGHTS_ON_TIMELINE':
      return { ...state, showHighlightsOnTimeline: !state.showHighlightsOnTimeline };
  }
}

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES;
    const obj = parsed as Record<string, unknown>;

    const globalOptions = validateExportOptions(obj.globalOptions);
    const showHighlightsOnTimeline =
      typeof obj.showHighlightsOnTimeline === 'boolean'
        ? obj.showHighlightsOnTimeline
        : DEFAULT_PREFERENCES.showHighlightsOnTimeline;

    return { globalOptions, showHighlightsOnTimeline };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function validateExportOptions(value: unknown): ExportOptions {
  if (typeof value !== 'object' || value === null) return DEFAULT_EXPORT_OPTIONS;
  const obj = value as Record<string, unknown>;

  const validFormats = FORMATS;
  const validQualities = QUALITIES;
  const validResolutions = RESOLUTIONS;

  return {
    format: validFormats.includes(obj.format as ExportOptions['format'])
      ? (obj.format as ExportOptions['format'])
      : DEFAULT_EXPORT_OPTIONS.format,
    quality: validQualities.includes(obj.quality as ExportOptions['quality'])
      ? (obj.quality as ExportOptions['quality'])
      : DEFAULT_EXPORT_OPTIONS.quality,
    resolution: validResolutions.includes(obj.resolution as ExportOptions['resolution'])
      ? (obj.resolution as ExportOptions['resolution'])
      : DEFAULT_EXPORT_OPTIONS.resolution,
  };
}

export function usePreferences() {
  const [preferences, dispatch] = useReducer(reducer, undefined, loadPreferences);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const setGlobalOptions = (options: ExportOptions) =>
    dispatch({ type: 'SET_GLOBAL_OPTIONS', payload: options });

  const toggleHighlightsOnTimeline = () =>
    dispatch({ type: 'TOGGLE_HIGHLIGHTS_ON_TIMELINE' });

  return {
    globalOptions: preferences.globalOptions,
    showHighlightsOnTimeline: preferences.showHighlightsOnTimeline,
    setGlobalOptions,
    toggleHighlightsOnTimeline,
  } as const;
}
