import React from 'react';

import Context from './ragContext';
import db, { VectorDBEntry } from '@store/db.ts';
import { ActiveLines, Benchmarks } from '@store/ragContext/types.ts';
import useLlm from '@store/llm/useLlm.ts';

import PdfParserClass from '@utils/PdfParser/PdfParser.ts';

const RagContextProvider: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { generate } = useLlm();
  const [entries, setEntries] = React.useState<Array<VectorDBEntry>>([]);
  const [pdfTitle, setPdfTitle] = React.useState<string>('');
  const [benchmarks, setBenchmarks] = React.useState<Benchmarks>({
    pdfParsedMillis: 0,
    entriesVectorized: 0,
    entriesVectorizedMillis: 0,
    searchDbCount: 0,
    searchDbMillis: 0,
    generatedMillis: 0,
  });
  const [prompt, setPrompt] = React.useState<string>('');
  const [llmResponse, setLlmResponse] = React.useState<string>('');
  const [results, setResults] = React.useState<Array<[VectorDBEntry, number]>>(
    []
  );
  const [activeLines, setActiveLines] = React.useState<ActiveLines>({
    exact: [],
    fuzzy: [],
  });

  const setBenchmark = (key: keyof Benchmarks, value: number) =>
    setBenchmarks((benchmarks) => ({ ...benchmarks, [key]: value }));

  const parsePdf = async (
    file: File,
    callback: (processed: number, total: number) => void = null
  ) => {
    const started = new Date();
    try {
      const parser = new PdfParserClass(file);
      const { paragraphs, metadata } = await parser.parsePdf();
      // @ts-ignore
      const title = metadata.info.Title || file.name;
      setBenchmark('pdfParsedMillis', new Date().getTime() - started.getTime());
      const startedVector = new Date();
      db.clear();
      const entries = await db.addEntries(
        paragraphs.reduce(
          (acc, paragraph) => [
            ...acc,
            ...paragraph.sentences.map((sentence) => ({
              str: sentence.str,
              metadata: {
                index: sentence.index,
                paragraphIndex: sentence.paragraphIndex,
              },
            })),
          ],
          []
        ),
        callback
      );
      setBenchmark('entriesVectorized', entries.length);
      setBenchmark(
        'entriesVectorizedMillis',
        new Date().getTime() - startedVector.getTime()
      );

      console.log('Entries:', entries.length);
      setEntries(entries);
      setPdfTitle(title);
    } catch (error) {
      console.error(error);
      alert('Error parsing PDF');
      return;
    }
  };

  const processQuery = async (query: string) => {
    setPrompt('');
    setActiveLines({ exact: [], fuzzy: [] });
    setResults([]);
    const started = new Date();
    const results = await db.search(query);
    setBenchmark('searchDbMillis', new Date().getTime() - started.getTime());
    setBenchmark('searchDbCount', results.length);
    setResults(results);

    const activeLines: Array<string> = [];
    const fuzzyLines: Array<string> = [];

    const foundEntries: Array<string> = [];
    results.map((result) => {
      let entry = '';
      [...Array(5).keys()].forEach((i) => {
        const line = entries.find(
          (entry) =>
            entry.metadata.paragraphIndex ===
              result[0].metadata.paragraphIndex &&
            entry.metadata.index === result[0].metadata.index + (i - 3)
        );
        if (line) {
          entry += ' ' + line.str;
          if (i - 3 === 0) {
            activeLines.push(
              line.metadata.paragraphIndex + '-' + line.metadata.index
            );
          } else {
            fuzzyLines.push(
              line.metadata.paragraphIndex + '-' + line.metadata.index
            );
          }
        }
      });
      foundEntries.push(entry);
    });
    setActiveLines({ exact: activeLines, fuzzy: fuzzyLines });

    let prompt = `These are parts of the ${pdfTitle}:\n\n`;

    foundEntries.forEach((result) => {
      prompt += `"${result}"`;
      prompt += '\n\n';
    });

    prompt += query;
    prompt += '\n\nAnswer in Markdown format.';

    setPrompt(prompt);

    const startedLlm = new Date();
    const t = await generate(prompt, (str) => setLlmResponse(str.output));
    setBenchmark(
      'generatedMillis',
      new Date().getTime() - startedLlm.getTime()
    );
    setLlmResponse(t);
  };

  return (
    <Context.Provider
      value={{
        pdfTitle,
        setPdfTitle,
        parsePdf,
        benchmarks,
        entries,
        prompt,
        llmResponse,
        processQuery,
        results,
        activeLines,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export default RagContextProvider;
