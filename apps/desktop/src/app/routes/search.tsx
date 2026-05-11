import { useState } from 'react';
import type { AnswerArtifact } from '@frag-note/domain';
import { AnswerPanel } from '../../features/search/answer-panel.tsx';
import { SearchForm } from '../../features/search/search-form.tsx';
import { useSaveAnswerFragment } from '../../features/search/use-save-answer-fragment.ts';
import { useTranslation } from '../../i18n/LocaleContext.tsx';

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
  const { t } = useTranslation();
  const [queryText, setQueryText] = useState('');
  const [answer, setAnswer] = useState<AnswerArtifact | null>(null);
  const saveAnswer = useSaveAnswerFragment({
    saveAnswerAsFragment: onSaveAnswer,
  });

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('search.title')}</h2>
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
