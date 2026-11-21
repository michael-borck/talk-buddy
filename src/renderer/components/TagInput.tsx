// TagInput — a small chip editor for free-form tags. Add with Enter or comma,
// remove with the ×. Used on Sessions and Projects; Scenarios already have a
// tag field in their form, so this is the shared control for the rest.
import { useState } from 'react';
import { X } from 'lucide-react';

export function TagInput({
  tags,
  onChange,
  placeholder = 'Add a tag…',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const t = draft.trim().replace(/,$/, '');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft('');
  };

  const remove = (t: string) => onChange(tags.filter((x) => x !== t));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs"
        >
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            className="text-blue-400 hover:text-blue-700"
            aria-label={`Remove tag ${t}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder}
        className="px-2 py-0.5 text-xs border border-gray-300 rounded-full focus:ring-1 focus:ring-blue-500 w-28"
      />
    </div>
  );
}