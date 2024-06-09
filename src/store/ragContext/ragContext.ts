import React from 'react';
import { ActiveLines, Benchmarks } from './types';
import { VectorDBEntry } from '@store/db.ts';

export interface RagContext {
  pdfTitle: string;
  setPdfTitle: (title: string) => void;
  parsePdf: (
    file: File,
    callback?: (processed: number, total: number) => void
  ) => Promise<void>;
  benchmarks: Benchmarks;
  entries: Array<VectorDBEntry>;
  prompt: string;
  llmResponse: string;
  processQuery: (query: string) => Promise<void>;
  results: Array<[VectorDBEntry, number]>;
  activeLines: ActiveLines;
}

const ragContext = React.createContext<RagContext>({
  pdfTitle: '',
  setPdfTitle: (_title: string) => {},
  parsePdf: async (
    _file: File,
    _callback: (processed: number, total: number) => void
  ) => {},
  benchmarks: {
    pdfParsedMillis: 0,
    entriesVectorized: 0,
    entriesVectorizedMillis: 0,
    searchDbCount: 0,
    searchDbMillis: 0,
    generatedMillis: 0,
  },
  entries: [],
  prompt: '',
  llmResponse: '',
  processQuery: async (_query: string) => {},
  results: [],
  activeLines: {
    exact: [],
    fuzzy: [],
  },
});

export default ragContext;
