# Journal Policy Finder — Rebuild Design

**Date:** 2026-07-30
**Status:** Approved for planning
**Author:** Dieyun Song (with Claude)

## Summary

Rebuild the Journal Policy Finder from a DataTables list of ~6,147 journal rows into a
**search-and-filter tool** where a Northwestern-affiliated researcher enters a **journal title
or ISSN** and receives the **publisher's policy information** (website, open-access options,
embargo/sharing rules, APC info, important notes), with a **Northwestern transformative-agreement
(TA) badge** where one applies. A second **browse/filter mode** lets researchers who don't yet
have a target journal filter by **discipline** and **TA availability** to discover candidate
journals.

The tool complements [TA-Finder](https://github.com/dieyunsong/TA-Finder): TA-Finder covers
journals under Northwestern/BTAA transformative agreements; this tool covers *all* publishers and
merely *flags* the TA ones. Together they give complete coverage without gaps or overlap.

## Motivation

The current tool aggregates at the **journal level**, but prior work established that:

- Most publishers publish only **publisher-level** policy; journal-level policy usually does not
  exist.
- There are far too many journals to research one by one.
- Researchers in higher education know the **journal** they want to publish in, not its publisher.

So the valuable service is: *given a journal, lead the researcher to the publisher and present the
logistical policy information*, saving them from googling it themselves.

## Key decisions (settled during brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | Publisher policy coverage depth | **Claude-assisted, hand-reviewed top ~200 publishers**, on an all-publishers lookup layer |
| 2 | Relationship to TA-Finder | **Combined interface**, TA data kept in a **separate, independently-updatable file** (overlay) |
| 3 | Codebase | **Fresh clean static build in this repo** (vanilla JS + JSON, like security-screener); retire Jekyll/Ruby/DataTables; keep URL + git history |
| 4 | Lookup index size threshold | Include journals with **works_count ≥ 25** (drop near-dead titles) |
| 5 | TA overlay granularity | **Journal-level** (matched on ISSN-L), not publisher-level |
| 6 | Discipline filter | **In v1**, using the **Google Scholar** category/subcategory taxonomy as display labels; membership derived from OpenAlex via a crosswalk; users pick **1–3 tags** |
| 7 | Name | **Journal Policy Finder** (unchanged) |
| 8 | Batch input | Out of scope; single-entry search |

## Architecture

A **fully static site** — HTML + vanilla JS + JSON, no backend, served by GitHub Pages. Modeled on
the security-screener tool: one-time data load, all search/filter in the browser.

### Three decoupled data layers

The layers are deliberately separated so that each has a single reason to change:

| File | Role | Approx. size | Changes when |
|---|---|---|---|
| `data/journals-index.json` | **Lookup — all publishers.** Journal → publisher pointer. Fields per journal: display name, ISSN-L, all ISSNs, publisher id, works_count, discipline tag(s). | Large; trimmed by works_count ≥ 25; gzipped in transit | OpenAlex rebuild (rare) |
| `data/publishers.json` | **Curated policy cards — top ~200.** Per publisher: display name, homepage, oa_options URL, embargo_sharing URL, apc URL, note, verified date. | Small (~200 entries) | A publisher changes policy |
| `data/ta-agreements.json` | **TA overlay — independent.** The set of journals (ISSN-L keyed) that a Northwestern/BTAA transformative agreement covers, snapshotted from TA-Finder. Optional per-journal note/link. | Small | **Only when NU contracts change** |

**Why decoupled:** a contract change edits only `ta-agreements.json`; a policy correction edits only
`publishers.json`; the giant lookup index barely ever changes. No cross-file coupling, so
maintenance stays cheap and low-risk — this is the property the user explicitly wants for the TA
data.

### Data flow

```
User query (journal title or ISSN)
        │
        ▼
[journals-index.json]  ── match ──▶ journal record (publisher id, ISSN-L, tags)
        │
        ├─▶ [publishers.json]        ── publisher id ──▶ policy card  (if in top 200)
        │        else                                   ── fallback card (homepage + Sherpa/DOAJ, flagged)
        │
        └─▶ [ta-agreements.json]     ── ISSN-L ──▶ TA badge + TA-Finder link (if covered)
```

## Match logic

Tiered matching, adapted from security-screener, prioritizing precision then recall:

1. **ISSN exact** — user typed an ISSN (any of the journal's ISSNs, normalized `NNNN-NNNN`).
2. **Title exact** — case-insensitive exact match on display name.
3. **Title normalized** — strip punctuation, articles, whitespace; match.
4. **Fuzzy** — prefix + bounded edit distance, to catch typos/variants.

**Disambiguation:** if a title matches multiple journals (common short titles), present a short
candidate list ("did you mean… — *Publisher*") rather than guessing. **Not found:** offer nearest
matches and prompt to try the ISSN.

## Result card

- **Curated publisher (in top 200):** full card — publisher website, OA options, embargo & sharing,
  APC info, notes, "verified <date>", plus a **TA badge + TA-Finder link** if the journal is covered.
- **Long-tail publisher (not in top 200):** still **names the publisher** and shows its homepage
  (from OpenAlex) plus **Sherpa Romeo** and **DOAJ** lookup links, clearly flagged *"not yet
  curated — confirm on the publisher's site."* Never fabricates policy detail ("grounded or blank").

## Browse / filter mode (second entry point)

For researchers without a target journal:

- Filter controls: **1–3 discipline tags** (Google Scholar taxonomy) + optional **TA-only** toggle.
- Result: a filtered list of journals, each showing publisher + TA badge, clickable into the card.
- Supports the described workflow: *filter by research topic → filter by TA → pick a journal.*

### Discipline taxonomy — approach and caveat

- **Display labels:** Google Scholar's 8 top-level areas and their subcategories
  (e.g. Business/Economics/Management → Accounting, Finance, Marketing, …). Familiar to researchers.
- **Membership source:** Google Scholar publishes **no bulk journal→category mapping** (only top-20
  lists, no API), so each journal's tag(s) are derived from **OpenAlex subject fields/subfields**
  via a **hand-built crosswalk** (OpenAlex field → GS subcategory).
- **Caveat (documented in UI):** tags are OpenAlex-derived and approximate — correct for the large
  majority, occasionally coarse on interdisciplinary titles. Applied to **all indexed journals**.

## Build pipeline (Python; retires Ruby/Jekyll)

1. `scripts/fetch_openalex.py` — pull OpenAlex sources (journals) with ISSN-L, ISSNs, publisher,
   works_count, subject fields. Emits:
   - the lookup index (filtered to works_count ≥ 25), and
   - a **publisher ranking by works_count** → the **top-200 list** to curate.
   *(Scilit blocks scraping; OpenAlex works_count ordering is an effectively equivalent proxy. The
   top-200 list is reviewed with the user before curation begins.)*
2. **Claude-assisted verification** — a fan-out workflow drafts each of the top-200 publisher cards
   (web-search → fetch candidate policy pages → confirm HTTP 200 → draft note). Output:
   `publishers.json`. **Human review** follows (~25–40 hrs, front-loaded on the top ~150).
3. `scripts/build_crosswalk.py` (or a static crosswalk data file) — OpenAlex field → GS subcategory
   mapping; applied to tag journals in the index.
4. `scripts/build_ta_overlay.py` — reconcile TA-Finder's journal list to index entries by ISSN-L →
   `ta-agreements.json`.
5. `scripts/build.py` — assemble/validate the final data files.
6. **Node unit tests** — matching tiers, normalization, ISSN join, TA join, disambiguation.
7. **GitHub Pages** workflow deploys the static site on push to `main`.

## Testing strategy

- Unit tests (Node) for the browser matching module: ISSN normalization/exact, title exact,
  normalized, fuzzy, disambiguation, and the TA ISSN-L join.
- Build-time validation: every curated publisher has the required policy fields; every TA entry
  resolves to an index journal; no dangling publisher ids.

## Out of scope for v1

- Batch/multi-journal input.
- Auto-ingesting policy for the long tail from Sherpa Romeo/DOAJ (we only *link out* to them).
- Merging TA data into the main dataset (kept separate by design).

## Open risks

- **Lookup index size:** the ≥25 threshold should keep it to a few MB gzipped; if still heavy, shard
  by ISSN prefix / first letter and lazy-load. To be verified during the build.
- **Tail accuracy of curated cards:** concentrated in publishers ~150–200; mitigated by human review
  and the "confirm on publisher page" framing.
- **Crosswalk coarseness:** interdisciplinary journals may be mis-tagged; acceptable and labeled.
- **TA snapshot drift:** `ta-agreements.json` is a snapshot of TA-Finder; the refresh step (copy
  when contracts change) must be documented so the two don't silently diverge.

## Migration / repo notes

- Retire `Gemfile`, `Dockerfile`, `compose.yml`, `bin/build_data` (Ruby), the Jekyll `html/`
  DataTables app, and the `work/` pipeline once the new build produces equivalent or better data.
- Keep git history and the GitHub Pages URL.
- Reuse the verified `work/publisher-policies.json` content as the seed for the corresponding
  entries in the new `publishers.json`.
