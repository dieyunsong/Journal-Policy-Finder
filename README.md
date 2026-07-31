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
| `html/data/taxonomy.json` | Browse taxonomy, plus the tag lookup table, per-tag journal counts, and OpenAlex publisher homepages | — | — |

A curated publisher may list `aliases` — extra OpenAlex ids for the same
publisher. Springer Nature, for example, publishes under several ids; without
aliases those journals would show the "not yet curated" card under their own
publisher's name. Only add an alias when OpenAlex labels the id as the same
publisher, so no journal ever inherits another publisher's policy.

**Discipline tags are interned.** Each journal's `tags` are integer ids into
`taxonomy.json`'s `tag_list`, not slug strings. The slugs repeat across ~52,700
journals and accounted for roughly three quarters of the payload when stored
inline. `tag_counts` lets the browse UI hide subcategories that no journal
carries — without it, 127 of 299 chips returned nothing when clicked.

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
python3 -m scripts.fetch_openalex    # full OpenAlex pull -> build/sources.jsonl (~30 minutes)
python3 -m scripts.fetch_publishers  # publisher homepages -> build/publishers.jsonl (~1 minute)
python3 -m scripts.build             # assembles + validates html/data/*.json
```

`build/` is gitignored — the fetch scripts write there and `scripts.build` reads it back. The four
`html/data/*.json` files are **committed, prebuilt** artifacts; the live site never runs Python —
it just fetches those static JSON files. `fetch_publishers` is optional: without
`build/publishers.jsonl` the build still succeeds, and fallback cards simply omit the publisher
website link.

`scripts/build.py` exits non-zero on any validation error, so a bad edit fails the build instead of
silently shipping (`scripts/validate.py`):

- required fields on every curated publisher;
- every TA entry resolves to a journal in the index;
- **every curated publisher id (and alias) matches at least one journal** — a mistyped OpenAlex id
  otherwise joins to nothing and silently degrades that publisher to the uncurated card;
- **every crosswalk tag exists in the taxonomy** — otherwise a journal can carry a tag that no
  browse checkbox can ever select.

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
  Subfields are ranked by how many of the journal's articles fall under each, and every mapped tag
  is kept. Keeping only the top few was tried and reverted — OpenAlex's per-topic subfield labels
  are noisy at the head, so trimming buried flagship journals (*The Lancet* resolved to aerospace,
  economics, and transport, and disappeared from every medical category). Broad multidisciplinary
  journals will still carry tags that look odd; the fix for a specific journal is to correct the
  mapping in `scripts/crosswalk.json`.
- **Not every publisher is curated yet.** Journals whose publisher isn't in
  `html/data/publishers.json` get a fallback card linking to the publisher plus
  [Sherpa Romeo](https://v2.sherpa.ac.uk/romeo/) and [DOAJ](https://doaj.org/) so there's still
  somewhere useful to go.

## License

Distributed under the license in [`LICENSE.txt`](LICENSE.txt).
