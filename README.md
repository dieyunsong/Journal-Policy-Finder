# Journal Policy Finder

A static web tool that helps authors find a **journal's publisher policy** in one place: the
publisher's website, its **open access (OA) options**, **embargo & self-archiving (green OA)**
rules, and where to find **Article Processing Charge (APC)** information. Enter a journal title or
ISSN and get a policy card with links straight to the publisher's own pages — plus a **Northwestern
transformative agreement (TA)** badge when that journal is covered by one. A second mode lets you
**browse by discipline** (Google Scholar subject taxonomy, pick 1–3 tags, optionally TA-only) to
discover journals rather than look one up by name.

Live site: <https://dieyunsong.github.io/Journal-Policy-Finder/>

This tool complements [TA-Finder](https://github.com/dieyunsong/TA-Finder), which lists the
APC waivers/discounts each Northwestern/BTAA transformative agreement provides in detail. Journal
Policy Finder covers **every publisher's** policies (curated ones get a full card, everyone else a
fallback card with useful links) and simply **flags** which journals have a Northwestern TA;
TA-Finder is the place to go for the discount specifics of those agreements.

## What it does

- **Search** — type a journal title or ISSN. The tool resolves it against an all-publishers index
  and shows: the publisher's policy card (or a fallback card if the publisher isn't curated yet)
  and, if applicable, a TA badge.
- **Browse by discipline** — pick up to three subject tags from a Google Scholar–style taxonomy
  (business/economics, chemical/material sciences, engineering/CS, health/medical, humanities,
  life/earth sciences, physics/math, social sciences, each with subcategories) and optionally
  filter to TA-covered journals only.

## The three data layers

The site reads three independent JSON files from `html/data/`, plus a taxonomy file, deliberately
kept separate so that updating one never requires touching the others:

| File | What it is | Size (current) | Keyed by |
|---|---|---|---|
| `html/data/journals-index.json` | All-publishers lookup, pulled from [OpenAlex](https://openalex.org), filtered to journals with `works_count >= 25` | ~52,700 journals | ISSN-L |
| `html/data/publishers.json` | Curated, human-verified policy cards (homepage, OA options, embargo/sharing, APC, notes) | 11 seed publishers today, expanding toward ~200 | OpenAlex publisher id (e.g. `P4310320595`) |
| `html/data/ta-agreements.json` | Northwestern TA overlay, built from `data/northwestern-agreements.csv` | ~4,500 journals | ISSN-L |
| `html/data/taxonomy.json` | The discipline browse taxonomy (copied from `data/taxonomy.json`) | — | — |

Why decoupled:

- **A TA contract change** (Northwestern adds/drops/renegotiates an agreement) only ever touches
  `data/northwestern-agreements.csv` → rebuild → only `ta-agreements.json` changes.
- **A policy fix** (a publisher's embargo page moved, an APC link is wrong) only ever touches
  `data/publishers.json` → rebuild → only `publishers.json` changes.
- **The big index** (`journals-index.json`) is pulled fresh from OpenAlex and rarely needs to
  change — it doesn't know or care about TA status or curated policies at all; `scripts/build.py`
  joins the other two onto it at build time.

Publisher curation itself (schema, how to add/verify an entry) is documented in
[`docs/curation/README.md`](docs/curation/README.md).

## Rebuilding the data

```sh
pip install -r requirements.txt
python3 -m scripts.fetch_openalex   # full OpenAlex pull -> build/sources.jsonl (several minutes)
python3 -m scripts.build            # assembles + validates html/data/*.json
```

`build/` is gitignored — `scripts.fetch_openalex` writes `build/sources.jsonl` there and
`scripts.build` reads it back. The four `html/data/*.json` files are **committed, prebuilt**
artifacts; the live site never runs Python — it just fetches those static JSON files.

`scripts/build.py` validates the curated publisher entries and the TA overlay
(`scripts/validate.py`) and exits non-zero on any schema error, so a bad edit to
`data/publishers.json` or `data/northwestern-agreements.csv` fails the build instead of silently
shipping.

## TA refresh procedure

When Northwestern's transformative agreements change (a new publisher, a renewed/expired deal,
corrected terms):

1. Edit `data/northwestern-agreements.csv`.
2. Rerun `python3 -m scripts.build`.
3. Only `html/data/ta-agreements.json` is regenerated — the journal index and publisher cards are
   untouched.

Rows in the CSV that couldn't be matched to a journal in the index are reported to
`build/ta-unmatched.json` (also gitignored) so nothing silently drops out of the overlay.

## Running tests

```sh
python3 -m pytest -q
node --test tests/js/     # or: npm test
```

## Running locally

```sh
python3 -m http.server -d html 8000
# then open http://localhost:8000/
```

## Deployment

Published with **GitHub Pages**. `.github/workflows/deploy-pages.yml` deploys the static contents
of `html/` (including the prebuilt `html/data/*.json`) on every push to `main` — no build step runs
in CI. Live at <https://dieyunsong.github.io/Journal-Policy-Finder/>.

## Data caveats

- **Publisher policies change.** Always confirm current terms (embargo length, APC amount,
  licence) on the linked publisher page before relying on them.
- **Discipline tags are approximate.** They're derived from OpenAlex subfield metadata mapped onto
  the Google Scholar taxonomy (`scripts/crosswalk.json`), not a hand-curated subject assignment.
- **Not every publisher is curated yet.** Journals whose publisher isn't in
  `html/data/publishers.json` get a fallback card linking to the publisher plus
  [Sherpa Romeo](https://v2.sherpa.ac.uk/romeo/) and [DOAJ](https://doaj.org/) so there's still
  somewhere useful to go.

## License

Distributed under the license in [`LICENSE.txt`](LICENSE.txt).
