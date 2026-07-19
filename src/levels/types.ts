import type { EngineState } from '../git/types';

export interface Level {
  id: string;
  title: string;
  concept: string;
  paragraphs: string[];
  hints: string[];
  goalCheck: (state: EngineState) => boolean;
  successMessage: string;
}
