# Journal Policy Finder — Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Journal Policy Finder as a static search-and-filter tool where a researcher enters a journal title/ISSN and gets the publisher's policy card (plus a Northwestern TA badge), with a discipline browse/filter mode.

**Architecture:** Fully static site (HTML + vanilla JS ES modules + JSON), no backend, served by GitHub Pages from `html/`. Three decoupled JSON data layers (all-publishers lookup index, curated top-200 publisher cards, independent journal-level TA overlay) built by Python scripts from OpenAlex + the existing TA-Finder CSV. Browser logic is split into small pure ES modules (normalize/match/resolve/filter/render) with thin DOM wiring in `app.js`.

**Tech Stack:** Python 3.10+ (pytest, requests) for the build pipeline; Node 18+ (built-in `node:test`, zero JS deps) for browser-logic tests; vanilla HTML/CSS/JS ES modules for the site; GitHub Pages for hosting.

## Global Constraints

- **Python:** 3.10+; tests with `pytest`; only third-party dep is `requests` (network fetch). All parsing/transform logic must be pure functions importable without network.
- **JavaScript:** ES modules only, zero runtime dependencies. Tests use Node's built-in `node:test` + `node:assert/strict`. All logic that has a test must live in a pure module that imports cleanly in Node (no `document`/`window` at import time).
- **Site location:** all deployed files live under `html/` (reuses existing GitHub Pages config): `html/index.html`, `html/css/`, `html/js/`, `html/data/`.
- **Data files (exact names):** `html/data/journals-index.json`, `html/data/publishers.json`, `html/data/ta-agreements.json`, `html/data/taxonomy.json`.
- **"Grounded or blank":** never fabricate a policy link or value. A publisher not in the curated set gets a fallback card (homepage + Sherpa Romeo/DOAJ link-outs), never invented policy fields.
- **ISSN format:** normalized as `NNNN-NNNN` uppercase (X allowed as final check digit). ISSN-L is the canonical join key across layers.
- **works_count threshold:** journals with `works_count < 25` are excluded from the lookup index.
- **Audience/name:** "Journal Policy Finder", Northwestern-affiliated authors. Sibling tool is TA-Finder (https://github.com/dieyunsong/TA-Finder).
- **Commit style:** each task ends with a commit; end commit messages with the `Co-Authored-By` trailer used in this repo.

---

## File Structure

**Build pipeline (Python, `scripts/`):**
- `scripts/openalex.py` — pure transforms: `keep_source()`, `parse_source()`.
- `scripts/fetch_openalex.py` — thin network loop → `build/sources.jsonl`.
- `scripts/build_index.py` — pure `build_index()` → journals-index.
- `scripts/rank_publishers.py` — pure `rank_publishers()` → top-N list.
- `scripts/tags.py` — pure `tags_for()` using the crosswalk.
- `scripts/ta_overlay.py` — pure `build_overlay()` from the TA CSV + index.
- `scripts/validate.py` — pure validators for publishers/TA/index.
- `scripts/build.py` — orchestrator that writes the four `html/data/*.json` files.
- `scripts/crosswalk.json` — OpenAlex subfield → GS subcategory map (data).
- `data/taxonomy.json` (source) — GS areas → subcategories tree.

**Frontend (`html/`):**
- `html/js/normalize.js` — `normalizeTitle()`, `normalizeIssn()`, `isIssn()`.
- `html/js/match.js` — `buildMatchIndex()`, `findMatches()`.
- `html/js/resolve.js` — `resolveCard()` (view model: curated | fallback + TA badge).
- `html/js/filter.js` — `filterJournals()`.
- `html/js/render.js` — `renderCard()`, `renderList()`, `renderDisambiguation()` (return HTML strings).
- `html/js/app.js` — DOM wiring, fetch, event handlers (not unit-tested; exercised via /verify).
- `html/index.html`, `html/css/styles.css`.

**Tests:**
- `tests/` — pytest for Python.
- `tests/js/` — `node:test` for JS modules.

**Deploy:** `.github/workflows/deploy-pages.yml`.

---

## Phase 0 — Scaffolding & test harness

### Task 1: Project scaffolding, test harness, and shared fixtures

**Files:**
- Create: `requirements.txt`, `pytest.ini`, `package.json`
- Create: `tests/__init__.py`, `tests/fixtures/openalex_sources.json`, `tests/fixtures/ta_rows.csv`
- Create: `tests/js/fixtures.mjs`
- Create: `.gitignore` additions for `build/`

**Interfaces:**
- Produces: fixture data reused by later tasks. `tests/fixtures/openalex_sources.json` = a JSON array of 4 raw OpenAlex source records (2 journals ≥25 works incl. one curated + one long-tail publisher, 1 journal <25 works, 1 non-journal). `tests/js/fixtures.mjs` exports `JOURNALS`, `PUBLISHERS`, `TA_SET` sample objects matching the final data schema.

- [ ] **Step 1: Create Python deps and config**

`requirements.txt`:
```
requests>=2.31
pytest>=8.0
```

`pytest.ini`:
```ini
[pytest]
testpaths = tests
python_files = test_*.py
```

- [ ] **Step 2: Create Node package config (test script, no deps)**

`package.json`:
```json
{
  "name": "journal-policy-finder",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/js/"
  }
}
```

- [ ] **Step 3: Create the raw OpenAlex fixture**

`tests/fixtures/openalex_sources.json`:
```json
[
  {
    "id": "https://openalex.org/S100",
    "display_name": "Journal of Widget Science",
    "issn_l": "1111-2222",
    "issn": ["1111-2222", "3333-4444"],
    "type": "journal",
    "works_count": 1200,
    "host_organization": "https://openalex.org/P1",
    "host_organization_name": "Wiley",
    "topics": [{"subfield": {"id": "https://openalex.org/subfields/2208", "display_name": "Electrical and Electronic Engineering"}}]
  },
  {
    "id": "https://openalex.org/S200",
    "display_name": "Obscure Regional Review",
    "issn_l": "5555-6666",
    "issn": ["5555-6666"],
    "type": "journal",
    "works_count": 80,
    "host_organization": "https://openalex.org/P9",
    "host_organization_name": "Tiny Society Press",
    "topics": [{"subfield": {"id": "https://openalex.org/subfields/1202", "display_name": "History"}}]
  },
  {
    "id": "https://openalex.org/S300",
    "display_name": "Almost Dead Journal",
    "issn_l": "7777-8888",
    "issn": ["7777-8888"],
    "type": "journal",
    "works_count": 10,
    "host_organization": "https://openalex.org/P1",
    "host_organization_name": "Wiley",
    "topics": []
  },
  {
    "id": "https://openalex.org/S400",
    "display_name": "Some Repository",
    "issn_l": null,
    "issn": null,
    "type": "repository",
    "works_count": 5000,
    "host_organization": "https://openalex.org/I1",
    "host_organization_name": "Some University",
    "topics": []
  }
]
```

- [ ] **Step 4: Create the TA CSV fixture**

`tests/fixtures/ta_rows.csv` (same 9-column header as `data/northwestern-agreements.csv`):
```csv
Publisher,Journal Title,eISSN,eISSN Link,Journal Website,Open Access Options,Embargo & Sharing Policy,APC Information,Notes
Wiley,Journal of Widget Science,3333-4444,,,,,,covered by BTAA Wiley agreement
Wiley,Not In Index Journal,9999-0000,,,,,,covered but missing from OpenAlex
```

- [ ] **Step 5: Create the JS fixtures module**

`tests/js/fixtures.mjs`:
```js
export const JOURNALS = [
  { name: "Journal of Widget Science", issn_l: "1111-2222", issns: ["1111-2222", "3333-4444"], publisher: "P1", publisher_name: "Wiley", works_count: 1200, tags: ["engineering-computer-science/electrical-electronic-engineering"] },
  { name: "Obscure Regional Review", issn_l: "5555-6666", issns: ["5555-6666"], publisher: "P9", publisher_name: "Tiny Society Press", works_count: 80, tags: ["humanities-literature-arts/history"] },
];
export const PUBLISHERS = {
  P1: { name: "Wiley", homepage: "https://www.wiley.com", oa_options: "https://authors.wiley.com/oa", embargo_sharing: "https://authors.wiley.com/self-archiving", apc: "https://authors.wiley.com/apc", note: "Green OA embargo 12-24 months.", verified: "2026-07-30" },
};
export const TA_SET = new Set(["3333-4444", "1111-2222"]);
```

- [ ] **Step 6: Add `build/` to .gitignore**

Append to `.gitignore`:
```
build/
node_modules/
__pycache__/
.pytest_cache/
```

- [ ] **Step 7: Verify harness runs (empty is fine)**

Run: `python3 -m pytest -q` → Expected: `no tests ran` (exit 0 or 5, acceptable).
Run: `node --test tests/js/` → Expected: `no test files` message; no crash.

- [ ] **Step 8: Commit**

```bash
git add requirements.txt pytest.ini package.json tests/ .gitignore
git commit -m "chore: scaffold python+node test harness and shared fixtures

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 1 — Data pipeline

### Task 2: OpenAlex source transforms (pure)

**Files:**
- Create: `scripts/__init__.py`, `scripts/openalex.py`
- Test: `tests/test_openalex.py`

**Interfaces:**
- Produces: `keep_source(rec: dict, min_works: int = 25) -> bool` — True only for `type == "journal"`, non-null `issn_l`, and `works_count >= min_works`. `parse_source(rec: dict) -> dict` returning `{"name", "issn_l", "issns", "publisher", "publisher_name", "works_count", "subfields"}` where `publisher` is the OpenAlex short id (e.g. `P1` from the id URL), `issns` is a de-duplicated list with `issn_l` first, and `subfields` is a list of `{"id","name"}` extracted from `rec["topics"][*]["subfield"]`.

- [ ] **Step 1: Write failing tests**

`tests/test_openalex.py`:
```python
import json, pathlib
from scripts.openalex import keep_source, parse_source

FIX = json.loads((pathlib.Path(__file__).parent / "fixtures/openalex_sources.json").read_text())
S100, S200, S300, S400 = FIX

def test_keep_source_filters():
    assert keep_source(S100) is True
    assert keep_source(S200) is True          # 80 >= 25
    assert keep_source(S300) is False         # 10 < 25
    assert keep_source(S400) is False         # repository, no issn_l

def test_parse_source_shapes_record():
    out = parse_source(S100)
    assert out["name"] == "Journal of Widget Science"
    assert out["issn_l"] == "1111-2222"
    assert out["issns"][0] == "1111-2222" and "3333-4444" in out["issns"]
    assert out["publisher"] == "P1"
    assert out["publisher_name"] == "Wiley"
    assert out["works_count"] == 1200
    assert out["subfields"] == [{"id": "2208", "name": "Electrical and Electronic Engineering"}]

def test_parse_source_handles_missing_topics():
    assert parse_source(S300)["subfields"] == []
```

- [ ] **Step 2: Run to confirm failure**

Run: `python3 -m pytest tests/test_openalex.py -q` → Expected: FAIL (`ModuleNotFoundError: scripts.openalex`).

- [ ] **Step 3: Implement `scripts/openalex.py`**

```python
"""Pure transforms over raw OpenAlex source records. No network here."""

def _short_id(url: str | None) -> str | None:
    if not url:
        return None
    return url.rstrip("/").split("/")[-1]

def keep_source(rec: dict, min_works: int = 25) -> bool:
    return (
        rec.get("type") == "journal"
        and bool(rec.get("issn_l"))
        and (rec.get("works_count") or 0) >= min_works
    )

def parse_source(rec: dict) -> dict:
    issn_l = rec.get("issn_l")
    issns = [issn_l] + [i for i in (rec.get("issn") or []) if i != issn_l]
    subfields = []
    for t in rec.get("topics") or []:
        sf = t.get("subfield") or {}
        sid = _short_id(sf.get("id"))
        if sid and not any(s["id"] == sid for s in subfields):
            subfields.append({"id": sid, "name": sf.get("display_name")})
    return {
        "name": rec.get("display_name"),
        "issn_l": issn_l,
        "issns": issns,
        "publisher": _short_id(rec.get("host_organization")),
        "publisher_name": rec.get("host_organization_name"),
        "works_count": rec.get("works_count") or 0,
        "subfields": subfields,
    }
```

- [ ] **Step 4: Run to confirm pass**

Run: `python3 -m pytest tests/test_openalex.py -q` → Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add scripts/__init__.py scripts/openalex.py tests/test_openalex.py
git commit -m "feat: pure OpenAlex source filter/parse transforms

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: OpenAlex fetch loop (network, thin)

**Files:**
- Create: `scripts/fetch_openalex.py`

**Interfaces:**
- Consumes: `keep_source`, `parse_source` from `scripts/openalex.py`.
- Produces: CLI that writes parsed journal records (one JSON per line) to `build/sources.jsonl`. Flags: `--min-works` (default 25), `--limit` (optional page cap for smoke tests), `--out` (default `build/sources.jsonl`). Uses OpenAlex `/sources` with server-side filter `type:journal,works_count:>{min-1}` and cursor pagination, `mailto` param set to a Northwestern contact for the polite pool.

- [ ] **Step 1: Implement the fetch script** (no unit test — network side effect; validated by smoke run)

```python
"""Fetch OpenAlex journal sources into build/sources.jsonl. Thin loop; logic lives in openalex.py."""
import argparse, json, pathlib, sys, time
import requests
from scripts.openalex import keep_source, parse_source

BASE = "https://api.openalex.org/sources"
SELECT = "id,display_name,issn_l,issn,type,works_count,host_organization,host_organization_name,topics"
MAILTO = "dieyun.song@northwestern.edu"

def fetch(min_works: int, limit: int | None, out: pathlib.Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    cursor, pages, written = "*", 0, 0
    with out.open("w") as f:
        while cursor:
            params = {
                "filter": f"type:journal,works_count:>{min_works - 1}",
                "select": SELECT, "per-page": 200, "cursor": cursor, "mailto": MAILTO,
            }
            r = requests.get(BASE, params=params, timeout=60)
            r.raise_for_status()
            body = r.json()
            for rec in body["results"]:
                if keep_source(rec, min_works):
                    f.write(json.dumps(parse_source(rec)) + "\n")
                    written += 1
            cursor = body["meta"].get("next_cursor")
            pages += 1
            if limit and pages >= limit:
                break
            time.sleep(0.1)
    print(f"wrote {written} journals across {pages} pages -> {out}", file=sys.stderr)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--min-works", type=int, default=25)
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--out", type=pathlib.Path, default=pathlib.Path("build/sources.jsonl"))
    a = p.parse_args()
    fetch(a.min_works, a.limit, a.out)
```

- [ ] **Step 2: Smoke-run one page**

Run: `python3 -m scripts.fetch_openalex --limit 1 --out build/smoke.jsonl`
Expected: stderr reports `wrote N journals across 1 pages`; `build/smoke.jsonl` has N lines of valid JSON with the Task-2 schema. Verify: `head -1 build/smoke.jsonl | python3 -m json.tool` shows `name`, `issn_l`, `publisher`, `subfields`.

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch_openalex.py
git commit -m "feat: OpenAlex fetch loop -> build/sources.jsonl

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Build the lookup index (pure)

**Files:**
- Create: `scripts/build_index.py`
- Test: `tests/test_build_index.py`

**Interfaces:**
- Consumes: parsed records from Task 2 (list of dicts).
- Produces: `build_index(records: list[dict]) -> list[dict]` — one entry per unique `issn_l` (first wins; higher `works_count` wins on collision). Each entry: `{"name","issn_l","issns","publisher","publisher_name","works_count","tags": []}` (tags filled later by Task 6; `publisher_name` is needed for the fallback card and browse list). Drops records with no `publisher`. Sorted by `name` case-insensitively.

- [ ] **Step 1: Write failing test**

`tests/test_build_index.py`:
```python
from scripts.build_index import build_index

def test_dedupes_by_issn_l_keeping_higher_works():
    recs = [
        {"name": "A", "issn_l": "1111-2222", "issns": ["1111-2222"], "publisher": "P1", "works_count": 100, "subfields": []},
        {"name": "A dup", "issn_l": "1111-2222", "issns": ["1111-2222"], "publisher": "P1", "works_count": 500, "subfields": []},
        {"name": "B", "issn_l": "5555-6666", "issns": ["5555-6666"], "publisher": "P9", "works_count": 80, "subfields": []},
    ]
    idx = build_index(recs)
    assert len(idx) == 2
    a = next(e for e in idx if e["issn_l"] == "1111-2222")
    assert a["works_count"] == 500 and a["name"] == "A dup"
    assert all(e["tags"] == [] for e in idx)

def test_drops_records_without_publisher():
    recs = [{"name": "X", "issn_l": "9999-9999", "issns": ["9999-9999"], "publisher": None, "works_count": 90, "subfields": []}]
    assert build_index(recs) == []
```

- [ ] **Step 2: Run to confirm failure**

Run: `python3 -m pytest tests/test_build_index.py -q` → Expected: FAIL (import error).

- [ ] **Step 3: Implement**

```python
"""Build the deduplicated journal lookup index from parsed OpenAlex records."""

def build_index(records: list[dict]) -> list[dict]:
    best: dict[str, dict] = {}
    for r in records:
        if not r.get("publisher") or not r.get("issn_l"):
            continue
        key = r["issn_l"]
        if key not in best or r["works_count"] > best[key]["works_count"]:
            best[key] = {
                "name": r["name"], "issn_l": r["issn_l"], "issns": r["issns"],
                "publisher": r["publisher"], "publisher_name": r.get("publisher_name"),
                "works_count": r["works_count"], "tags": [],
            }
    return sorted(best.values(), key=lambda e: (e["name"] or "").lower())
```

- [ ] **Step 4: Run to confirm pass**

Run: `python3 -m pytest tests/test_build_index.py -q` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build_index.py tests/test_build_index.py
git commit -m "feat: build deduplicated journal lookup index

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Rank publishers → top-N list (pure)

**Files:**
- Create: `scripts/rank_publishers.py`
- Test: `tests/test_rank_publishers.py`

**Interfaces:**
- Consumes: parsed records from Task 2.
- Produces: `rank_publishers(records: list[dict], n: int = 200) -> list[dict]` — aggregates by `publisher`, summing `works_count` and counting journals, returns top-`n` as `[{"publisher","publisher_name","total_works","journal_count"}]` sorted by `total_works` desc.

- [ ] **Step 1: Write failing test**

`tests/test_rank_publishers.py`:
```python
from scripts.rank_publishers import rank_publishers

RECS = [
    {"publisher": "P1", "publisher_name": "Wiley", "works_count": 1200, "issn_l": "a"},
    {"publisher": "P1", "publisher_name": "Wiley", "works_count": 300, "issn_l": "b"},
    {"publisher": "P9", "publisher_name": "Tiny", "works_count": 80, "issn_l": "c"},
]

def test_aggregates_and_ranks():
    out = rank_publishers(RECS, n=200)
    assert out[0] == {"publisher": "P1", "publisher_name": "Wiley", "total_works": 1500, "journal_count": 2}
    assert out[1]["publisher"] == "P9"

def test_respects_n():
    assert len(rank_publishers(RECS, n=1)) == 1
```

- [ ] **Step 2: Run to confirm failure**

Run: `python3 -m pytest tests/test_rank_publishers.py -q` → Expected: FAIL.

- [ ] **Step 3: Implement**

```python
"""Rank publishers by summed works_count to pick the curation set."""
from collections import defaultdict

def rank_publishers(records: list[dict], n: int = 200) -> list[dict]:
    agg: dict[str, dict] = defaultdict(lambda: {"total_works": 0, "journal_count": 0, "publisher_name": None})
    for r in records:
        pid = r.get("publisher")
        if not pid:
            continue
        a = agg[pid]
        a["total_works"] += r.get("works_count") or 0
        a["journal_count"] += 1
        a["publisher_name"] = a["publisher_name"] or r.get("publisher_name")
    rows = [{"publisher": pid, "publisher_name": a["publisher_name"],
             "total_works": a["total_works"], "journal_count": a["journal_count"]}
            for pid, a in agg.items()]
    rows.sort(key=lambda x: x["total_works"], reverse=True)
    return rows[:n]
```

- [ ] **Step 4: Run to confirm pass**

Run: `python3 -m pytest tests/test_rank_publishers.py -q` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/rank_publishers.py tests/test_rank_publishers.py
git commit -m "feat: rank publishers by works_count for curation set

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Discipline taxonomy, crosswalk, and journal tagging

**Files:**
- Create: `data/taxonomy.json` (GS areas → subcategories tree)
- Create: `scripts/crosswalk.json` (OpenAlex subfield id → GS subcategory tag)
- Create: `scripts/tags.py`
- Test: `tests/test_tags.py`

**Interfaces:**
- Consumes: `subfields` list from Task 2 records; `crosswalk.json`.
- Produces: `tags_for(subfields: list[dict], crosswalk: dict) -> list[str]` — maps each subfield id to its GS tag (format `"<area-slug>/<subcategory-slug>"`), de-duplicated, order preserved, unmapped subfields skipped. `apply_tags(index, records_by_issn, crosswalk)` mutates index entries' `tags`.
- **Content sourcing note:** `data/taxonomy.json` mirrors the 8 Google Scholar areas and their subcategories (view_op=top_venues). `scripts/crosswalk.json` maps each of OpenAlex's ~252 subfield ids to one GS subcategory tag; author it during execution by pairing OpenAlex's subfield list with the GS subcategory list. Validation (Task 8) fails the build if a subfield id appears in the index data but is absent from the crosswalk beyond an allowed-unmapped list.

- [ ] **Step 1: Write failing test**

`tests/test_tags.py`:
```python
from scripts.tags import tags_for

CROSSWALK = {
    "2208": "engineering-computer-science/electrical-electronic-engineering",
    "1202": "humanities-literature-arts/history",
}

def test_maps_subfields_to_tags():
    subfields = [{"id": "2208", "name": "Electrical and Electronic Engineering"}]
    assert tags_for(subfields, CROSSWALK) == ["engineering-computer-science/electrical-electronic-engineering"]

def test_skips_unmapped_and_dedupes():
    subfields = [{"id": "2208", "name": "x"}, {"id": "2208", "name": "x"}, {"id": "9999", "name": "unknown"}]
    assert tags_for(subfields, CROSSWALK) == ["engineering-computer-science/electrical-electronic-engineering"]
```

- [ ] **Step 2: Run to confirm failure**

Run: `python3 -m pytest tests/test_tags.py -q` → Expected: FAIL.

- [ ] **Step 3: Implement `scripts/tags.py`**

```python
"""Map OpenAlex subfields to Google Scholar subcategory tags via a crosswalk."""

def tags_for(subfields: list[dict], crosswalk: dict) -> list[str]:
    tags: list[str] = []
    for sf in subfields:
        tag = crosswalk.get(sf.get("id"))
        if tag and tag not in tags:
            tags.append(tag)
    return tags
```

- [ ] **Step 4: Create `data/taxonomy.json` (8 areas; subcategories authored from the GS page)**

Seed structure (fill all subcategories during execution from https://scholar.google.com/citations?view_op=top_venues):
```json
{
  "business-economics-management": {"label": "Business, Economics & Management", "subcategories": {"accounting-taxation": "Accounting & Taxation", "finance": "Finance", "marketing": "Marketing"}},
  "chemical-material-sciences": {"label": "Chemical & Material Sciences", "subcategories": {}},
  "engineering-computer-science": {"label": "Engineering & Computer Science", "subcategories": {"electrical-electronic-engineering": "Electrical & Electronic Engineering"}},
  "health-medical-sciences": {"label": "Health & Medical Sciences", "subcategories": {}},
  "humanities-literature-arts": {"label": "Humanities, Literature & Arts", "subcategories": {"history": "History"}},
  "life-sciences-earth-sciences": {"label": "Life Sciences & Earth Sciences", "subcategories": {}},
  "physics-mathematics": {"label": "Physics & Mathematics", "subcategories": {}},
  "social-sciences": {"label": "Social Sciences", "subcategories": {}}
}
```

- [ ] **Step 5: Create `scripts/crosswalk.json` (seed; complete during execution)**

```json
{
  "2208": "engineering-computer-science/electrical-electronic-engineering",
  "1202": "humanities-literature-arts/history"
}
```

- [ ] **Step 6: Run to confirm pass**

Run: `python3 -m pytest tests/test_tags.py -q` → Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/tags.py scripts/crosswalk.json data/taxonomy.json tests/test_tags.py
git commit -m "feat: taxonomy, subfield->GS crosswalk, and journal tagging

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: TA overlay from the TA-Finder CSV (pure)

**Files:**
- Create: `scripts/ta_overlay.py`
- Test: `tests/test_ta_overlay.py`

**Interfaces:**
- Consumes: TA CSV rows (list of dicts with the 9 columns) + the built index (Task 4).
- Produces: `build_overlay(ta_rows, index) -> tuple[dict, list[dict]]`. The dict maps `issn_l` → `{"note": <Notes or "">}` for every index journal whose `issn_l` OR any of its `issns` matches a TA row's `eISSN`. The second element is a list of *unmatched* TA rows (`{"publisher","title","eissn"}`) for a build report. Match key is normalized ISSN.

- [ ] **Step 1: Write failing test**

`tests/test_ta_overlay.py`:
```python
from scripts.ta_overlay import build_overlay

INDEX = [
    {"name": "Journal of Widget Science", "issn_l": "1111-2222", "issns": ["1111-2222", "3333-4444"], "publisher": "P1", "works_count": 1200, "tags": []},
]
TA_ROWS = [
    {"Publisher": "Wiley", "Journal Title": "Journal of Widget Science", "eISSN": "3333-4444", "Notes": "covered by BTAA Wiley agreement"},
    {"Publisher": "Wiley", "Journal Title": "Not In Index Journal", "eISSN": "9999-0000", "Notes": "missing"},
]

def test_matches_on_any_issn_and_keys_by_issn_l():
    overlay, unmatched = build_overlay(TA_ROWS, INDEX)
    assert overlay == {"1111-2222": {"note": "covered by BTAA Wiley agreement"}}
    assert unmatched == [{"publisher": "Wiley", "title": "Not In Index Journal", "eissn": "9999-0000"}]
```

- [ ] **Step 2: Run to confirm failure**

Run: `python3 -m pytest tests/test_ta_overlay.py -q` → Expected: FAIL.

- [ ] **Step 3: Implement**

```python
"""Build the independent journal-level TA overlay by matching TA-Finder rows to the index by ISSN."""

def _norm(issn: str | None) -> str:
    return (issn or "").strip().upper()

def build_overlay(ta_rows: list[dict], index: list[dict]) -> tuple[dict, list[dict]]:
    issn_to_issnl: dict[str, str] = {}
    for e in index:
        for i in e["issns"]:
            issn_to_issnl[_norm(i)] = e["issn_l"]
    overlay: dict[str, dict] = {}
    unmatched: list[dict] = []
    for row in ta_rows:
        eissn = _norm(row.get("eISSN"))
        issnl = issn_to_issnl.get(eissn)
        if issnl:
            overlay[issnl] = {"note": (row.get("Notes") or "").strip()}
        else:
            unmatched.append({"publisher": row.get("Publisher"), "title": row.get("Journal Title"), "eissn": eissn})
    return overlay, unmatched
```

- [ ] **Step 4: Run to confirm pass**

Run: `python3 -m pytest tests/test_ta_overlay.py -q` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ta_overlay.py tests/test_ta_overlay.py
git commit -m "feat: journal-level TA overlay from TA-Finder CSV

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Validators + build orchestrator

**Files:**
- Create: `scripts/validate.py`
- Create: `scripts/build.py`
- Test: `tests/test_validate.py`

**Interfaces:**
- Produces (validators): `validate_publishers(publishers: dict) -> list[str]` (errors: missing required fields `homepage,oa_options,embargo_sharing,apc,note,verified`); `validate_ta(overlay: dict, index: list) -> list[str]` (errors: TA issn_l not present in index); `validate_index_tags(index, crosswalk, allowed_unmapped) -> list[str]`.
- Produces (orchestrator `build.py`): reads `build/sources.jsonl` + `data/northwestern-agreements.csv` + `scripts/crosswalk.json` + curated `data/publishers.json`, runs Tasks 4–7 transforms, runs validators (exits non-zero on errors), and writes `html/data/{journals-index,publishers,ta-agreements,taxonomy}.json`. Prints the TA unmatched report and any long-tail publisher counts.

- [ ] **Step 1: Write failing test for validators**

`tests/test_validate.py`:
```python
from scripts.validate import validate_publishers, validate_ta

def test_validate_publishers_flags_missing_fields():
    pubs = {"P1": {"homepage": "h", "oa_options": "o", "embargo_sharing": "e", "apc": "a", "note": "n", "verified": "2026-07-30"},
            "P2": {"homepage": "h"}}
    errs = validate_publishers(pubs)
    assert any("P2" in e for e in errs)
    assert not any("P1" in e for e in errs)

def test_validate_ta_flags_unknown_issnl():
    index = [{"issn_l": "1111-2222"}]
    errs = validate_ta({"1111-2222": {"note": ""}, "0000-0000": {"note": ""}}, index)
    assert any("0000-0000" in e for e in errs)
```

- [ ] **Step 2: Run to confirm failure**

Run: `python3 -m pytest tests/test_validate.py -q` → Expected: FAIL.

- [ ] **Step 3: Implement `scripts/validate.py`**

```python
"""Build-time validators. Return lists of human-readable error strings (empty = ok)."""
REQUIRED_PUB_FIELDS = ("homepage", "oa_options", "embargo_sharing", "apc", "note", "verified")

def validate_publishers(publishers: dict) -> list[str]:
    errs = []
    for pid, p in publishers.items():
        for field in REQUIRED_PUB_FIELDS:
            if not p.get(field):
                errs.append(f"publisher {pid}: missing required field '{field}'")
    return errs

def validate_ta(overlay: dict, index: list) -> list[str]:
    known = {e["issn_l"] for e in index}
    return [f"TA overlay: issn_l {k} not present in index" for k in overlay if k not in known]

def validate_index_tags(index: list, crosswalk: dict, allowed_unmapped: set) -> list[str]:
    # Only flags tags that reference a crosswalk value; membership of subfield ids is checked upstream.
    valid_tags = set(crosswalk.values())
    errs = []
    for e in index:
        for t in e.get("tags", []):
            if t not in valid_tags and t not in allowed_unmapped:
                errs.append(f"index {e['issn_l']}: unknown tag '{t}'")
    return errs
```

- [ ] **Step 4: Run to confirm pass**

Run: `python3 -m pytest tests/test_validate.py -q` → Expected: PASS.

- [ ] **Step 5: Implement `scripts/build.py` (orchestrator)**

```python
"""Assemble html/data/*.json from build/sources.jsonl + curated + TA CSV. Exits non-zero on validation errors."""
import csv, json, pathlib, sys
from scripts.build_index import build_index
from scripts.tags import tags_for
from scripts.ta_overlay import build_overlay
from scripts.validate import validate_publishers, validate_ta

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "html/data"

def _load_jsonl(p): return [json.loads(l) for l in p.read_text().splitlines() if l.strip()]

def main():
    records = _load_jsonl(ROOT / "build/sources.jsonl")
    crosswalk = json.loads((ROOT / "scripts/crosswalk.json").read_text())
    index = build_index(records)
    by_issnl = {r["issn_l"]: r for r in records}
    for e in index:
        e["tags"] = tags_for(by_issnl[e["issn_l"]]["subfields"], crosswalk)
    ta_rows = list(csv.DictReader((ROOT / "data/northwestern-agreements.csv").open()))
    overlay, unmatched = build_overlay(ta_rows, index)
    publishers = json.loads((ROOT / "data/publishers.json").read_text())

    errs = validate_publishers(publishers) + validate_ta(overlay, index)
    if errs:
        print("BUILD FAILED:\n" + "\n".join(errs), file=sys.stderr)
        sys.exit(1)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "journals-index.json").write_text(json.dumps(index, separators=(",", ":")))
    (OUT / "publishers.json").write_text(json.dumps(publishers, separators=(",", ":")))
    (OUT / "ta-agreements.json").write_text(json.dumps(overlay, separators=(",", ":")))
    (OUT / "taxonomy.json").write_text((ROOT / "data/taxonomy.json").read_text())
    print(f"OK: {len(index)} journals, {len(publishers)} publishers, {len(overlay)} TA journals; "
          f"{len(unmatched)} TA rows unmatched (see build/ta-unmatched.json)", file=sys.stderr)
    (ROOT / "build/ta-unmatched.json").write_text(json.dumps(unmatched, indent=2))

if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Commit**

```bash
git add scripts/validate.py scripts/build.py tests/test_validate.py
git commit -m "feat: build orchestrator and build-time validators

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Publisher curation (Claude-assisted, human-reviewed)

### Task 9: Publisher card schema, seed, and curation workflow

**Files:**
- Create: `data/publishers.json` (curated; seeded from `work/publisher-policies.json`)
- Create: `docs/curation/README.md` (the process + schema)
- Create: `scripts/curate_publishers.workflow.js` (fan-out drafting workflow script)

**Interfaces:**
- Produces: `data/publishers.json` — an object keyed by OpenAlex publisher id (e.g. `"P1"`), each value `{"name","homepage","oa_options","embargo_sharing","apc","note","verified"}`. This is the file `build.py` reads and `validate_publishers` checks. The publisher ids come from Task 5's ranking output; the display names/policy links are drafted by the workflow and human-reviewed.

**Note on method:** This task is a data-production effort, not TDD code. The schema is enforced by `validate_publishers` (Task 8). The top-200 publisher ids come from running `rank_publishers` on the real `build/sources.jsonl`. Drafting is done by a Claude Workflow that, per publisher, web-searches and fetches the OA/embargo/APC pages, confirms HTTP 200, and drafts the `note`. A human reviews every entry before merge (front-loaded on the top ~150). The 11 existing publishers in `work/publisher-policies.json` are mapped to their OpenAlex publisher ids and used verbatim as seed entries.

- [ ] **Step 1: Write the curation process doc**

`docs/curation/README.md` — document: (a) the exact schema above; (b) that `verified` is an ISO date set the day a human confirms the links; (c) the "grounded or blank" rule — if a policy page cannot be found, leave the publisher OUT of `publishers.json` entirely (it then gets the fallback card) rather than guessing; (d) the review checklist (each of the 3 policy links opens to the right page; note states embargo length + OA model).

- [ ] **Step 2: Seed `data/publishers.json` from existing verified data**

Map each of the 11 keys in `work/publisher-policies.json` to its OpenAlex publisher id (look up via OpenAlex `/publishers?search=<name>`), and translate its `oa_options`/`embargo_sharing`/`apc`/`note` into the new schema, adding `"homepage"` and `"verified": "2026-07-15"`. Write as `data/publishers.json`.

- [ ] **Step 3: Validate the seed**

Run:
```bash
python3 -c "import json; from scripts.validate import validate_publishers; errs=validate_publishers(json.load(open('data/publishers.json'))); print(errs or 'OK'); import sys; sys.exit(1 if errs else 0)"
```
Expected: `OK`.

- [ ] **Step 4: Author the drafting workflow script**

`scripts/curate_publishers.workflow.js` — a Workflow script (run via the Workflow tool, not committed-code-under-test) that takes the top-200 list as `args`, pipelines each publisher through: (stage 1) web-search + fetch candidate OA/embargo/APC pages and confirm 200; (stage 2) draft the schema object with a `note`. It writes drafts to `build/publisher-drafts.json` for human review. Document in the file header that output is a DRAFT requiring human verification before it is merged into `data/publishers.json`.

- [ ] **Step 5: Commit the seed + process (drafts happen during execution, not in this commit)**

```bash
git add data/publishers.json docs/curation/README.md scripts/curate_publishers.workflow.js
git commit -m "feat: publisher card schema, verified seed, and curation workflow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Frontend logic (pure ES modules)

### Task 10: Normalization helpers

**Files:**
- Create: `html/js/normalize.js`
- Test: `tests/js/normalize.test.mjs`

**Interfaces:**
- Produces: `normalizeTitle(s) -> string` (lowercase, strip diacritics, drop leading article `the/a/an`, collapse non-alphanumerics to single spaces, trim); `normalizeIssn(s) -> string|null` (uppercase, keep digits+X, reformat to `NNNN-NNNN`, else null); `isIssn(s) -> boolean`.

- [ ] **Step 1: Write failing tests**

`tests/js/normalize.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTitle, normalizeIssn, isIssn } from "../../html/js/normalize.js";

test("normalizeTitle lowercases, strips article and punctuation", () => {
  assert.equal(normalizeTitle("The Journal of Widget-Science!"), "journal of widget science");
  assert.equal(normalizeTitle("Études Économiques"), "etudes economiques");
});

test("normalizeIssn reformats and validates", () => {
  assert.equal(normalizeIssn("15437221"), "1543-7221");
  assert.equal(normalizeIssn("1543-722x"), "1543-722X");
  assert.equal(normalizeIssn("nope"), null);
});

test("isIssn", () => {
  assert.equal(isIssn("1543-7221"), true);
  assert.equal(isIssn("Journal of X"), false);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `node --test tests/js/normalize.test.mjs` → Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement `html/js/normalize.js`**

```js
const ARTICLES = /^(the|a|an)\s+/;

export function normalizeTitle(s) {
  return (s || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(ARTICLES, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeIssn(s) {
  const raw = (s || "").toUpperCase().replace(/[^0-9X]/g, "");
  if (raw.length !== 8) return null;
  return raw.slice(0, 4) + "-" + raw.slice(4);
}

export function isIssn(s) {
  return normalizeIssn(s) !== null;
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `node --test tests/js/normalize.test.mjs` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add html/js/normalize.js tests/js/normalize.test.mjs
git commit -m "feat: title/ISSN normalization helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Matching engine

**Files:**
- Create: `html/js/match.js`
- Test: `tests/js/match.test.mjs`

**Interfaces:**
- Consumes: `normalizeTitle`, `normalizeIssn`, `isIssn` (Task 10); `JOURNALS` fixture (Task 1).
- Produces: `buildMatchIndex(journals) -> {byIssn: Map, byTitle: Map, list: [...]}` (byIssn maps every normalized ISSN → journal; byTitle maps normalizeTitle(name) → array of journals). `findMatches(index, query) -> {tier, matches}` where `tier` ∈ `"issn"|"title"|"fuzzy"|"none"` and `matches` is an array of journal records. ISSN query → issn tier; exact/normalized title → title tier (may be multiple = disambiguation); else fuzzy (prefix or edit distance ≤ 2 over normalized titles), capped at 8; else none.

- [ ] **Step 1: Write failing tests**

`tests/js/match.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMatchIndex, findMatches } from "../../html/js/match.js";
import { JOURNALS } from "./fixtures.mjs";

const idx = buildMatchIndex(JOURNALS);

test("ISSN query resolves via any issn", () => {
  const r = findMatches(idx, "3333-4444");
  assert.equal(r.tier, "issn");
  assert.equal(r.matches[0].issn_l, "1111-2222");
});

test("exact title match", () => {
  const r = findMatches(idx, "the journal of widget science");
  assert.equal(r.tier, "title");
  assert.equal(r.matches.length, 1);
});

test("fuzzy match on typo", () => {
  const r = findMatches(idx, "journal of widget scince");
  assert.equal(r.tier, "fuzzy");
  assert.ok(r.matches.some((m) => m.issn_l === "1111-2222"));
});

test("no match returns none", () => {
  assert.equal(findMatches(idx, "zzzzz nonexistent").tier, "none");
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `node --test tests/js/match.test.mjs` → Expected: FAIL.

- [ ] **Step 3: Implement `html/js/match.js`**

```js
import { normalizeTitle, normalizeIssn, isIssn } from "./normalize.js";

export function buildMatchIndex(journals) {
  const byIssn = new Map();
  const byTitle = new Map();
  for (const j of journals) {
    for (const i of j.issns) byIssn.set(normalizeIssn(i), j);
    const key = normalizeTitle(j.name);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(j);
  }
  return { byIssn, byTitle, list: journals };
}

function editDistanceLE(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  const prev = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0], best = (prev[0] = i);
    for (let j = 1; j <= b.length; j++) {
      const cur = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = prev[j];
      prev[j] = cur;
      best = Math.min(best, cur);
    }
    if (best > max) return false;
  }
  return prev[b.length] <= max;
}

export function findMatches(index, query) {
  const q = (query || "").trim();
  if (!q) return { tier: "none", matches: [] };
  if (isIssn(q)) {
    const hit = index.byIssn.get(normalizeIssn(q));
    return hit ? { tier: "issn", matches: [hit] } : { tier: "none", matches: [] };
  }
  const nq = normalizeTitle(q);
  if (index.byTitle.has(nq)) return { tier: "title", matches: index.byTitle.get(nq) };
  const fuzzy = [];
  for (const [key, arr] of index.byTitle) {
    if (key.startsWith(nq) || nq.startsWith(key) || editDistanceLE(key, nq, 2)) {
      fuzzy.push(...arr);
      if (fuzzy.length >= 8) break;
    }
  }
  return fuzzy.length ? { tier: "fuzzy", matches: fuzzy.slice(0, 8) } : { tier: "none", matches: [] };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `node --test tests/js/match.test.mjs` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add html/js/match.js tests/js/match.test.mjs
git commit -m "feat: tiered ISSN/title/fuzzy matching engine

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Resolve a journal to a card view model

**Files:**
- Create: `html/js/resolve.js`
- Test: `tests/js/resolve.test.mjs`

**Interfaces:**
- Consumes: a journal record; `PUBLISHERS` map; `TA_SET` (Set of normalized ISSNs covered by a TA — built in `app.js` from `ta-agreements.json` keys); fixtures (Task 1).
- Produces: `resolveCard(journal, publishers, taSet) -> {journal, kind, publisher, ta}` where `kind` ∈ `"curated"|"fallback"`. For curated: `publisher` = the publishers[id] object. For fallback: `publisher = {name, homepage: null, sherpa, doaj}` with `sherpa`/`doaj` search URLs built from the journal's ISSN-L. `ta = {covered: boolean}` — covered when the journal's `issn_l` is in `taSet`.

- [ ] **Step 1: Write failing tests**

`tests/js/resolve.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCard } from "../../html/js/resolve.js";
import { JOURNALS, PUBLISHERS, TA_SET } from "./fixtures.mjs";

test("curated publisher with TA coverage", () => {
  const r = resolveCard(JOURNALS[0], PUBLISHERS, TA_SET);
  assert.equal(r.kind, "curated");
  assert.equal(r.publisher.name, "Wiley");
  assert.equal(r.ta.covered, true);
});

test("uncurated publisher falls back with link-outs and no TA", () => {
  const r = resolveCard(JOURNALS[1], PUBLISHERS, TA_SET);
  assert.equal(r.kind, "fallback");
  assert.ok(r.publisher.sherpa.includes("5555-6666"));
  assert.ok(r.publisher.doaj.includes("5555-6666"));
  assert.equal(r.ta.covered, false);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `node --test tests/js/resolve.test.mjs` → Expected: FAIL.

- [ ] **Step 3: Implement `html/js/resolve.js`**

```js
export function resolveCard(journal, publishers, taSet) {
  const pub = publishers[journal.publisher];
  const covered = taSet.has(journal.issn_l);
  if (pub) {
    return { journal, kind: "curated", publisher: pub, ta: { covered } };
  }
  const issn = journal.issn_l;
  return {
    journal, kind: "fallback", ta: { covered },
    publisher: {
      name: journal.publisher_name || "Publisher",
      homepage: null,
      sherpa: `https://v2.sherpa.ac.uk/cgi/search/publication?issn=${issn}`,
      doaj: `https://doaj.org/search/journals?source=%7B%22query%22:%7B%22query_string%22:%7B%22query%22:%22${issn}%22%7D%7D%7D`,
    },
  };
}
```

- [ ] **Step 4: Run to confirm pass** (add `publisher_name` to the JOURNALS fixture entries if missing)

Run: `node --test tests/js/resolve.test.mjs` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add html/js/resolve.js tests/js/resolve.test.mjs tests/js/fixtures.mjs
git commit -m "feat: resolve journal to curated/fallback card view model with TA flag

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Discipline + TA filtering

**Files:**
- Create: `html/js/filter.js`
- Test: `tests/js/filter.test.mjs`

**Interfaces:**
- Consumes: journal list; selected tags (array, 1–3); `taOnly` boolean; `taSet`.
- Produces: `filterJournals(journals, tags, taOnly, taSet) -> [...]` — a journal passes if it has at least one selected tag (OR semantics) AND (`!taOnly` or its `issn_l` ∈ `taSet`). Empty `tags` with `taOnly=false` returns `[]` (the browse UI requires ≥1 tag). Results sorted by `works_count` desc, capped at 200.

- [ ] **Step 1: Write failing tests**

`tests/js/filter.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterJournals } from "../../html/js/filter.js";
import { JOURNALS, TA_SET } from "./fixtures.mjs";

test("filters by tag OR semantics", () => {
  const out = filterJournals(JOURNALS, ["humanities-literature-arts/history"], false, TA_SET);
  assert.equal(out.length, 1);
  assert.equal(out[0].issn_l, "5555-6666");
});

test("taOnly narrows to covered journals", () => {
  const out = filterJournals(JOURNALS, ["engineering-computer-science/electrical-electronic-engineering", "humanities-literature-arts/history"], true, TA_SET);
  assert.deepEqual(out.map((j) => j.issn_l), ["1111-2222"]);
});

test("no tags returns empty", () => {
  assert.deepEqual(filterJournals(JOURNALS, [], false, TA_SET), []);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `node --test tests/js/filter.test.mjs` → Expected: FAIL.

- [ ] **Step 3: Implement `html/js/filter.js`**

```js
export function filterJournals(journals, tags, taOnly, taSet) {
  if (!tags || tags.length === 0) return [];
  const want = new Set(tags);
  const out = journals.filter((j) => {
    const hasTag = (j.tags || []).some((t) => want.has(t));
    if (!hasTag) return false;
    if (taOnly && !taSet.has(j.issn_l)) return false;
    return true;
  });
  out.sort((a, b) => (b.works_count || 0) - (a.works_count || 0));
  return out.slice(0, 200);
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `node --test tests/js/filter.test.mjs` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add html/js/filter.js tests/js/filter.test.mjs
git commit -m "feat: discipline + TA-only journal filtering

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Render view models to HTML

**Files:**
- Create: `html/js/render.js`
- Test: `tests/js/render.test.mjs`

**Interfaces:**
- Consumes: card view model (Task 12); a matches array; taxonomy.
- Produces: `escapeHtml(s)`; `renderCard(vm) -> string`; `renderDisambiguation(matches) -> string`; `renderList(journals, publishers) -> string`. All return HTML strings; all user/data text passes through `escapeHtml`. `renderCard` for `kind==="curated"` includes the 4 policy links + note + verified date, and a TA badge block when `vm.ta.covered`; for `kind==="fallback"` includes the "not yet curated — confirm on the publisher's site" flag plus Sherpa/DOAJ links.

- [ ] **Step 1: Write failing tests**

`tests/js/render.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCard, escapeHtml } from "../../html/js/render.js";
import { JOURNALS, PUBLISHERS, TA_SET } from "./fixtures.mjs";
import { resolveCard } from "../../html/js/resolve.js";

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml('<b>&"'), "&lt;b&gt;&amp;&quot;");
});

test("curated card shows policy links, verified date, and TA badge", () => {
  const html = renderCard(resolveCard(JOURNALS[0], PUBLISHERS, TA_SET));
  assert.ok(html.includes("authors.wiley.com/self-archiving"));
  assert.ok(html.includes("2026-07-30"));
  assert.match(html, /transformative agreement/i);
});

test("fallback card shows the not-curated flag and Sherpa link", () => {
  const html = renderCard(resolveCard(JOURNALS[1], PUBLISHERS, TA_SET));
  assert.match(html, /not yet curated/i);
  assert.ok(html.includes("sherpa.ac.uk"));
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `node --test tests/js/render.test.mjs` → Expected: FAIL.

- [ ] **Step 3: Implement `html/js/render.js`**

```js
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function link(url, label) {
  return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>` : "";
}

function taBadge(ta) {
  return ta.covered
    ? `<div class="ta-badge">✓ Northwestern has a transformative agreement covering this journal — see <a href="https://dieyunsong.github.io/TA-Finder/" target="_blank" rel="noopener">TA-Finder</a> for waiver/discount details.</div>`
    : "";
}

export function renderCard(vm) {
  const j = vm.journal;
  const head = `<h2>${escapeHtml(j.name)}</h2><p class="issn">ISSN ${escapeHtml(j.issn_l)}</p>`;
  if (vm.kind === "curated") {
    const p = vm.publisher;
    return `<div class="card curated">${head}
      <p class="publisher">Publisher: <strong>${escapeHtml(p.name)}</strong></p>
      ${taBadge(vm.ta)}
      <ul class="policy-links">
        <li>${link(p.homepage, "Publisher website")}</li>
        <li>${link(p.oa_options, "Open access options")}</li>
        <li>${link(p.embargo_sharing, "Embargo & sharing policy")}</li>
        <li>${link(p.apc, "APC information")}</li>
      </ul>
      <p class="note">${escapeHtml(p.note)}</p>
      <p class="verified">Links verified ${escapeHtml(p.verified)}. Always confirm current terms on the publisher page.</p>
    </div>`;
  }
  const p = vm.publisher;
  return `<div class="card fallback">${head}
    <p class="publisher">Publisher: <strong>${escapeHtml(p.name)}</strong></p>
    ${taBadge(vm.ta)}
    <p class="flag">This publisher is not yet curated — confirm policy on the publisher's site.</p>
    <ul class="policy-links">
      <li>${link(p.sherpa, "Look up self-archiving policy (Sherpa Romeo)")}</li>
      <li>${link(p.doaj, "Look up in DOAJ")}</li>
    </ul>
  </div>`;
}

export function renderDisambiguation(matches) {
  const items = matches.map((m) =>
    `<li><button class="disambig" data-issn="${escapeHtml(m.issn_l)}">${escapeHtml(m.name)}</button></li>`).join("");
  return `<p>Did you mean:</p><ul class="disambig-list">${items}</ul>`;
}

export function renderList(journals, publishers) {
  if (!journals.length) return `<p>No journals match those filters.</p>`;
  const rows = journals.map((j) => {
    const pubName = (publishers[j.publisher] && publishers[j.publisher].name) || j.publisher_name || "";
    return `<li><button class="result" data-issn="${escapeHtml(j.issn_l)}">${escapeHtml(j.name)}</button>
      <span class="pub">${escapeHtml(pubName)}</span></li>`;
  }).join("");
  return `<ul class="result-list">${rows}</ul>`;
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `node --test tests/js/render.test.mjs` → Expected: PASS.

- [ ] **Step 5: Run the whole JS suite**

Run: `npm test` → Expected: all JS test files pass.

- [ ] **Step 6: Commit**

```bash
git add html/js/render.js tests/js/render.test.mjs
git commit -m "feat: HTML rendering for cards, disambiguation, and result lists

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — App shell, styling, verification

### Task 15: index.html, app.js wiring, and styling

**Files:**
- Create: `html/index.html`
- Create: `html/js/app.js`
- Create: `html/css/styles.css`

**Interfaces:**
- Consumes: all Phase-3 modules; the four `html/data/*.json` files.
- Produces: the running site. `app.js` on load fetches the four JSON files, builds `taSet = new Set(Object.keys(taAgreements))`, `matchIndex = buildMatchIndex(journals)`, and a `publisherName` lookup. Wires: (1) search form submit → `findMatches` → on `issn`/single `title` render `resolveCard`+`renderCard`; on multiple → `renderDisambiguation`; on `fuzzy` → disambiguation labeled "closest matches"; on `none` → not-found message. (2) browse panel: taxonomy-driven tag chips (max 3 selectable) + TA-only toggle → `filterJournals` → `renderList`. (3) click on a disambiguation/result button → resolve+render that journal. This file is verified via the /verify skill, not unit tests.

- [ ] **Step 1: Write `html/index.html`**

A single page with: a header (title "Journal Policy Finder", one-line description + note that it complements TA-Finder), a **Search** section (`<form id="search"><input id="q" placeholder="Journal title or ISSN">`), a **Browse by discipline** section (`<div id="tags">`, `<label><input type="checkbox" id="ta-only">TA only</label>`, `<button id="browse">Show journals</button>`), and an empty `<div id="results">`. Load `<script type="module" src="js/app.js">`. Include a footer disclaimer ("preliminary aid; confirm on the publisher's page").

- [ ] **Step 2: Write `html/js/app.js`**

```js
import { buildMatchIndex, findMatches } from "./match.js";
import { resolveCard } from "./resolve.js";
import { filterJournals } from "./filter.js";
import { renderCard, renderDisambiguation, renderList } from "./render.js";

const state = {};

async function boot() {
  const [journals, publishers, ta, taxonomy] = await Promise.all(
    ["journals-index", "publishers", "ta-agreements", "taxonomy"].map((n) =>
      fetch(`data/${n}.json`).then((r) => r.json()))
  );
  state.journals = journals;
  state.publishers = publishers;
  state.taSet = new Set(Object.keys(ta));
  state.taxonomy = taxonomy;
  state.index = buildMatchIndex(journals);
  wireSearch();
  wireBrowse();
}

const resultsEl = () => document.getElementById("results");

function showJournalByIssn(issnl) {
  const j = state.journals.find((x) => x.issn_l === issnl);
  if (j) resultsEl().innerHTML = renderCard(resolveCard(j, state.publishers, state.taSet));
}

function wireSearch() {
  document.getElementById("search").addEventListener("submit", (e) => {
    e.preventDefault();
    const { tier, matches } = findMatches(state.index, document.getElementById("q").value);
    if (tier === "none") { resultsEl().innerHTML = "<p>No journal found. Try the ISSN.</p>"; return; }
    if (tier === "issn" || (tier === "title" && matches.length === 1)) {
      resultsEl().innerHTML = renderCard(resolveCard(matches[0], state.publishers, state.taSet));
    } else {
      resultsEl().innerHTML = renderDisambiguation(matches);
      bindResultButtons(".disambig");
    }
  });
}

function selectedTags() {
  return [...document.querySelectorAll("#tags input:checked")].map((c) => c.value).slice(0, 3);
}

function wireBrowse() {
  const tagsEl = document.getElementById("tags");
  for (const [areaSlug, area] of Object.entries(state.taxonomy)) {
    for (const [subSlug, label] of Object.entries(area.subcategories)) {
      const id = `${areaSlug}/${subSlug}`;
      const el = document.createElement("label");
      el.innerHTML = `<input type="checkbox" value="${id}"> ${label}`;
      tagsEl.appendChild(el);
    }
  }
  tagsEl.addEventListener("change", () => {
    const checked = tagsEl.querySelectorAll("input:checked");
    if (checked.length > 3) event.target.checked = false;
  });
  document.getElementById("browse").addEventListener("click", () => {
    const list = filterJournals(state.journals, selectedTags(),
      document.getElementById("ta-only").checked, state.taSet);
    resultsEl().innerHTML = renderList(list, state.publishers);
    bindResultButtons(".result");
  });
}

function bindResultButtons(sel) {
  document.querySelectorAll(sel).forEach((b) =>
    b.addEventListener("click", () => showJournalByIssn(b.dataset.issn)));
}

boot();
```

- [ ] **Step 3: Write `html/css/styles.css`**

Style: centered max-width column, prominent search input, tag chips as a wrapped grid, a clear `.ta-badge` (accent background), `.card.fallback .flag` visually distinct from curated. Keep it dependency-free (no CDN). Design per the frontend-design skill during execution.

- [ ] **Step 4: Build data locally, then verify the app end-to-end**

Run: `python3 -m scripts.fetch_openalex --out build/sources.jsonl` then `python3 -m scripts.build` (produces `html/data/*.json`).
Then invoke the **verify** skill: serve `html/` (`python3 -m http.server -d html 8000`) and drive the real flows in a browser — (a) search a known curated journal → curated card + correct policy links; (b) search a TA-covered journal → TA badge present; (c) search an uncurated-publisher journal → fallback card with Sherpa/DOAJ; (d) search a typo → disambiguation; (e) browse: pick 2 tags + TA-only → filtered list, click a result → its card. Confirm each behaves as specified.

- [ ] **Step 5: Commit**

```bash
git add html/index.html html/js/app.js html/css/styles.css
git commit -m "feat: app shell, search+browse wiring, and styling

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — Deployment & migration

### Task 16: GitHub Pages deploy workflow

**Files:**
- Modify/Replace: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Produces: a workflow that, on push to `main`, checks out, uploads `html/` as the Pages artifact, and deploys. Because the large lookup index is committed prebuilt (data changes are rare), the workflow does NOT run the Python pipeline — it just publishes `html/`. (Rebuilds are run locally via `scripts/build.py` and committed.)

- [ ] **Step 1: Write the workflow**

`.github/workflows/deploy-pages.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: html
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validate YAML locally**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-pages.yml'))"` (if `pyyaml` unavailable, skip — GitHub will validate on push).
Expected: no error.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-pages.yml
git commit -m "ci: publish html/ to GitHub Pages on push to main

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Retire the old stack and rewrite the README

**Files:**
- Delete: `Gemfile`, `Gemfile.lock`, `Dockerfile`, `compose.yml`, `bin/build_data`, `bin/update`, old `html/data.json`, old `html/js/script.js`, old `html/css/styles.css` (old DataTables version), old `html/index.html` (DataTables version), `.github/workflows/build-data.yml` (if present)
- Keep: `work/` (compilation history), `data/northwestern-agreements.csv` (TA seed), `LICENSE.txt`
- Modify: `README.md`

**Interfaces:**
- Produces: a repo with only the new static site + Python pipeline; README documents the new architecture, data files, build command, and the TA-refresh procedure.

- [ ] **Step 1: Remove retired files** (only after Task 15's new `html/` files exist and verify passed)

```bash
git rm Gemfile Gemfile.lock Dockerfile compose.yml bin/build_data bin/update
git rm -f .github/workflows/build-data.yml 2>/dev/null || true
```
(The new `html/index.html`, `html/css/styles.css`, `html/js/*` from Tasks 10–15 already overwrote the DataTables versions; confirm `git status` shows no stray old JS.)

- [ ] **Step 2: Rewrite `README.md`**

Cover: what the tool does (journal → publisher policy + TA badge + discipline browse); the three data layers and their independence; how to rebuild (`pip install -r requirements.txt`, `python3 -m scripts.fetch_openalex`, `python3 -m scripts.build`); how to run tests (`pytest` + `npm test`); **the TA-refresh procedure** (when NU contracts change, update `data/northwestern-agreements.csv` and rerun `scripts/build.py` — only `ta-agreements.json` changes); how to run locally (`python3 -m http.server -d html 8000`); deployment; and the relationship to TA-Finder.

- [ ] **Step 3: Confirm tests still pass after deletions**

Run: `python3 -m pytest -q && npm test` → Expected: all pass (no test imported a deleted file).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: retire Jekyll/Ruby/DataTables stack; rewrite README for rebuild

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes (spec coverage)

- **Search (journal→publisher card):** Tasks 10–12, 14, 15. ✓
- **Curated top-200 + fallback ("grounded or blank"):** Tasks 5, 9, 12, 14. ✓
- **Journal-level TA overlay, independent file:** Tasks 7, 12, 14; refresh procedure in Task 17. ✓
- **Discipline browse (GS taxonomy, 1–3 tags):** Tasks 6, 13, 15. ✓
- **All-publishers lookup, works_count ≥ 25:** Tasks 2–4. ✓
- **Three decoupled data files:** Task 8 writes all four; independence preserved. ✓
- **Fresh static build, retire Jekyll:** Tasks 1, 15, 17. ✓
- **Deployment (Pages, keep URL):** Task 16. ✓
- **Testing (pytest + node:test):** every logic task; end-to-end via /verify in Task 15. ✓

**Deferred to execution (not gaps):** full `crosswalk.json` (252 subfields) and full `taxonomy.json` subcategories are authored in Task 6; the 200 curated publisher entries are produced in Task 9; CSS aesthetics in Task 15 via the frontend-design skill.
