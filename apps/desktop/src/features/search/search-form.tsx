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
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <input
        aria-label="Search query"
        value={queryText}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
