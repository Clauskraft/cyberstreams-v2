import React, { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { DEFAULT_OSINT_TOOLS, resolveOsintCategories } from "./tools";

export interface OsintTool {
  id: string;
  name: string;
  description: string;
  url: string;
  category?: string;
}

export interface OsintPanelProps {
  tools?: OsintTool[];
  onSearch: (query: string, category?: string) => void;
}

export const OsintPanel: React.FC<OsintPanelProps> = ({ tools = DEFAULT_OSINT_TOOLS, onSearch }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => resolveOsintCategories(tools), [tools]);

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesCategory = category === "all" || tool.category === category;
      const matchesQuery =
        q.length === 0 ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        (tool.category ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [category, query, tools]);

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setCategory(event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(query.trim(), category === "all" ? undefined : category);
  };

  const handleClear = () => {
    setQuery("");
    setCategory("all");
    onSearch("", undefined);
  };

  return (
    <section className="osint-panel">
      <header className="osint-panel__header">
        <div>
          <h2>OSINT Tools</h2>
          <p className="osint-panel__subtitle">Søg og filtrer værktøjer til dark web- og åben kildes efterforskning.</p>
        </div>
        <button type="button" className="osint-panel__clear" onClick={handleClear}>
          Nulstil
        </button>
      </header>

      <form className="osint-panel__form" onSubmit={handleSubmit} role="search">
        <label className="osint-panel__field">
          <span className="osint-panel__label">Søg</span>
          <input
            type="search"
            value={query}
            onChange={handleQueryChange}
            placeholder="Søg efter værktøj, kategori eller funktion..."
            aria-label="OSINT værktøjs-søgning"
          />
        </label>
        <label className="osint-panel__field">
          <span className="osint-panel__label">Kategori</span>
          <select value={category} onChange={handleCategoryChange} aria-label="OSINT kategori filter">
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "Alle kategorier" : cat}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="osint-panel__submit">
          Søg
        </button>
      </form>

      {filteredTools.length === 0 ? (
        <div className="osint-panel__empty" role="status">
          <p>Ingen værktøjer matcher dine filtre.</p>
          <button type="button" onClick={handleClear}>
            Ryd filtre
          </button>
        </div>
      ) : (
        <ul className="osint-panel__list">
          {filteredTools.map((tool) => (
            <li key={tool.id} className="osint-panel__item">
              <div className="osint-panel__item-header">
                <a href={tool.url} target="_blank" rel="noopener noreferrer">
                  {tool.name}
                </a>
                {tool.category ? <span className="osint-panel__badge">{tool.category}</span> : null}
              </div>
              <p>{tool.description}</p>
              <button type="button" onClick={() => onSearch(tool.name, tool.category)}>
                Søg efter {tool.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};


