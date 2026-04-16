# Figma Clone — LLM Wiki Schema

This file defines how the wiki is structured, what conventions to follow, and what workflows to use when ingesting sources, answering questions, or maintaining the wiki.

## Purpose

This wiki is a persistent, compounding knowledge base for the **Figma Clone** project — a browser-based design editor built with Next.js 15, React 19, TypeScript, Tailwind CSS, and Zustand. The wiki is maintained by an LLM agent and intended to be read by both humans and LLMs.

## Directory Layout

```
wiki/
├── index.md              # Table of contents — every page listed with one-line summary
├── log.md                # Append-only operation log (ingests, queries, lint passes)
├── concepts/             # Architectural patterns, design decisions, data flows
├── entities/             # Concrete things: components, modules, APIs, tools
└── sources/              # Summaries of key source files with cross-references
raw/                      # Immutable source material (articles, specs, screenshots)
```

## Page Format

Every wiki page follows this structure:

```markdown
# Title

> One-sentence summary of what this page covers.

**Topics:** topic-a, topic-b, topic-c
**Related:** [[link-to-related-page]], [[another-page]]
**Source:** path/to/source/file (if applicable)

---

(Body content — facts, explanations, code snippets, diagrams)
```

- **Topics** are lowercase, hyphenated tags for search and clustering.
- **Related** uses `[[wiki-link]]` style references to other wiki pages.
- **Source** points to the originating file in the codebase when applicable.

## Conventions

- One concept or entity per page. If a page grows beyond ~300 lines, split it.
- Cross-reference aggressively. Every entity page should link to the concepts it implements, and vice versa.
- Code snippets should include the file path and line range as a comment header.
- Use present tense ("the store manages..." not "the store managed...").
- Keep pages factual. Opinions and recommendations go in a dedicated `## Notes` section at the bottom.

## Workflows

### Ingest

When new source material is added to `raw/` or the codebase changes significantly:

1. Read the new/changed files.
2. Create or update relevant entity and concept pages.
3. Update `wiki/index.md` with any new pages.
4. Append an entry to `wiki/log.md`.

### Query

When answering questions about the project:

1. Search relevant wiki pages first.
2. If the wiki has sufficient information, answer from it with citations.
3. If not, read the source code, answer, and file the new knowledge back into the wiki.

### Lint

Periodic health check:

1. Look for orphan pages (not linked from index or other pages).
2. Look for broken `[[links]]`.
3. Flag stale information (wiki says X, code says Y).
4. Check for missing cross-references between related pages.
