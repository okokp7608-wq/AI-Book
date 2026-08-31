type Props = {
  categories: string[];
  selected: Set<string>;
  onToggle: (category: string) => void;
  onClear: () => void;
};

export function CategoryFilter({ categories, selected, onToggle, onClear }: Props) {
  if (categories.length === 0) return null;
  return (
    <div className="category-filter" role="group" aria-label="업종 필터">
      <button
        type="button"
        className={selected.size === 0 ? 'chip chip--active' : 'chip'}
        onClick={onClear}
      >
        전체
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={selected.has(category) ? 'chip chip--active' : 'chip'}
          aria-pressed={selected.has(category)}
          onClick={() => onToggle(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
