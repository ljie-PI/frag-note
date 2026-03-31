export function SearchForm({
  queryText,
  onChange,
  onSubmit,
}: {
  queryText: string;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void> | void;
}) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <input
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
        aria-label="搜索内容"
        value={queryText}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="submit" className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors">搜索</button>
    </form>
  );
}
