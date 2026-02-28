export interface Highlight {
  id: string;
  label: string;
  /** Primary seek point in seconds. */
  time: number;
  /** Optional end of the highlight range in seconds. When present, the highlight
   *  represents a span rather than a single moment. */
  endTime?: number;
}

/** Shape of the `.highlights.json` file written to disk and read back. */
export interface HighlightsFile {
  version: 1;
  highlights: Highlight[];
}
