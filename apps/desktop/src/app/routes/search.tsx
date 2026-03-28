import { useState } from 'react';
import type { AnswerArtifact } from '@sui-note/domain';
import { AnswerPanel } from '../../features/search/answer-panel.tsx';
import { SearchForm } from '../../features/search/search-form.tsx';
import { useSaveAnswerFragment } from '../../features/search/use-save-answer-fragment.ts';

export function SearchPage({
  onSearch,
  onSaveAnswer,
}: {
  onSearch: (input: {
    queryText: string;
    queryType: 'keyword' | 'natural_language';
  }) => Promise<AnswerArtifact>;
  onSaveAnswer: (answer: AnswerArtifact) => Promise<void>;
}) {
  const [queryText, setQueryText] = useState('');
  const [answer, setAnswer] = useState<AnswerArtifact | null>(null);
  const saveAnswer = useSaveAnswerFragment({
    saveAnswerAsFragment: onSaveAnswer,
  });

  return (
    <section>
      <h2>Search</h2>
      <SearchForm
        queryText={queryText}
        onChange={setQueryText}
        onSubmit={async () => {
          const nextAnswer = await onSearch({
            queryText,
            queryType: 'natural_language',
          });
          setAnswer(nextAnswer);
        }}
      />
      <AnswerPanel answer={answer} onSave={saveAnswer.save} />
    </section>
  );
}
