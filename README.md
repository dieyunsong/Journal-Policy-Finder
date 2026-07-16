# Northwestern University Journal Policy Finder

A static web tool that helps **Northwestern-affiliated authors** find each journal's **publisher policies** in
one place: how to publish **open access (OA)**, the publisher's **embargo and article-sharing (green OA /
self-archiving)** rules, and where to look up **Article Processing Charges (APCs)**. Every entry links to the
publisher's (or journal's) own page, so the authoritative source is one click away — useful for checking
compliance with funder and federal public-access mandates.

Live site: <https://dieyunsong.github.io/Journal-Policy-Finder/>

Adapted from the University of Michigan Libraries'
[article-processing-charge-list](https://github.com/mlibrary/article-processing-charge-list)
(BSD-3-Clause — see [`LICENSE.txt`](LICENSE.txt)). The DataTables search/filter UI in `html/` is substantially
the U-M code; the data and build pipeline are Northwestern-specific.

## What the data is

Each row is one journal from a publisher with which Northwestern (or the Big Ten Academic Alliance) has an open
access agreement — **6,147 journals across 12 publishers**. For each journal the tool provides links to the
publisher's OA, embargo/sharing, and APC policy pages, plus the journal's own website. Policy links were
located from each publisher's official pages and **verified during compilation** (each page was visited).

Two principles, both driven by the compliance requirement that a policy must never be mis-attributed to the
wrong journal:

- **Links, not values.** Because publisher terms change and vary by article type, the tool links to the current
  policy rather than quoting a number that could go stale or be transcribed wrong.
- **Grounded or blank.** Where a journal-specific page exists it is used; otherwise the publisher-wide page is
  linked and flagged in Notes. Where a link could not be grounded with confidence, it is left **blank** rather
  than guessed.

### Columns

The source CSV, [`data/northwestern-agreements.csv`](data/northwestern-agreements.csv), has 9 columns:

| Column | Meaning |
|---|---|
| `Publisher` | Publisher whose policies apply (drives the site's publisher filter). |
| `Journal Title` | The journal. |
| `eISSN` | Electronic ISSN (`NNNN-NNNN`), or blank. |
| `eISSN Link` | The journal's ISSN-portal record (derived from the eISSN). |
| `Journal Website` | The journal's own homepage. Blank when it could not be resolved with confidence. |
| `Open Access Options` | Publisher page on how to publish OA (gold / hybrid / green routes). |
| `Embargo & Sharing Policy` | Self-archiving / green-OA / repository-deposit policy incl. embargo length — the key page for public-access compliance. |
| `APC Information` | Where to find APC amounts (price list, calculator, or journal fees page). |
| `Notes` | Caveats: whether a link is publisher-level, embargo specifics, or why a website is blank. |

### How links were resolved

Journal websites were resolved per publisher and validated, never guessed:

- **Springer Nature / Cambridge**: matched via the [OpenAlex](https://openalex.org) journal record, then each
  candidate URL was fetched and required to return HTTP 200.
- **Wiley**: built from the eISSN, but only after cross-checking [Crossref](https://www.crossref.org) that the
  eISSN's publisher really is Wiley (this caught ~100 eISSNs on Wiley's platform that actually belong to IET,
  AGU, and other societies — those were left blank).
- **IOP**: eISSN URL pattern, each fetched and confirmed 200.
- **ACS**: OpenAlex journal code with the title cross-checked (ACS blocks automated fetches).
- **Small publishers** (Company of Biologists, Cold Spring Harbor, Cogitatio): verified per-journal page
  patterns.
- **ACM** journals and conference-proceedings series have no per-journal policy pages, so only the
  publisher-level ACM links are provided.

Policy links per publisher: some publishers (Springer Nature, Wiley, ACM, Cambridge, ACS, IOP, RSC) publish one
set of policy pages that apply across their journals; others (Company of Biologists, Cold Spring Harbor,
Cogitatio) have **journal-level** pages, which the tool links directly.

### Coverage snapshot

| Publisher | Journals | Journal websites resolved | Policy links |
|---|---:|---:|---|
| Springer Nature | 2,010 | 1,816 | publisher-level |
| Wiley | 1,873 | 1,772 | publisher-level |
| Association of Computing Machinery (ACM) | 1,631 | 0 (no per-journal pages) | publisher-level |
| Cambridge University Press | 412 | 329 | publisher-level |
| Institute of Physics (IOP) | 73 | 73 | publisher-level |
| American Chemical Society (ACS) | 72 | 51 | publisher-level |
| Royal Society of Chemistry | 56 | title-only | publisher-level |
| Microbiology Society | 6 | — | publisher-level |
| Cogitatio Press | 5 | 5 | journal-level |
| The Company of Biologists | 5 | — | journal-level |
| Cold Spring Harbor Laboratory Press | 4 | — | journal-level |

Policies change; always confirm current terms on the linked publisher page before relying on them.

## How it works

- `html/` is a fully static site (HTML + vanilla JS + DataTables + Bootstrap). No backend; all search and
  filtering happen in the browser.
- The site reads `html/data.json`, an object of the form `{ "header": [...], "version": "...", "data": [[...]] }`
  where each row is a positional array of 9 strings (`eISSN` / `eISSN Link` / `Journal Website` / `Notes` may
  be `null`):

  `Publisher | Journal Title | eISSN | eISSN Link | Journal Website | Open Access Options | Embargo & Sharing Policy | APC Information | Notes`

- `html/data.json` is **generated** from the CSV by `bin/build_data`. The three policy-link columns are
  required (a journal with no known policy link is not listed); the `version` field is a short content hash of
  the data, so rebuilding unchanged data is byte-for-byte reproducible.
- The scripts used to compile the dataset live in [`work/`](work/): `resolve_openalex.py` (eISSN → OpenAlex),
  `build_links.py` (validated journal websites), `publisher-policies.json` (the verified publisher-level policy
  map), and `build_final.py` (assembles the CSV).

## Editing the data

1. Edit `data/northwestern-agreements.csv` (9 columns as above). The file must be **UTF-8**.
2. Regenerate the JSON:

   ```sh
   ruby bin/build_data
   ```

3. Commit both the CSV and the regenerated `html/data.json`. CI (`.github/workflows/build-data.yml`) rebuilds
   and validates on every push and fails if `data.json` is out of date with the CSV.

## Running locally

```sh
ruby -run -e httpd html -p 8000
# then open http://localhost:8000/
```

## Deployment

Published with **GitHub Pages** at <https://dieyunsong.github.io/Journal-Policy-Finder/>.
`.github/workflows/deploy-pages.yml` rebuilds `data.json` and deploys `html/` on every push to `main`.

## Related project

[TA-Finder](https://github.com/dieyunsong/TA-Finder) is a companion site built from the same codebase that
lists the APC waivers/discounts each Northwestern/BTAA agreement provides, rather than the publisher policy
links here. The two repos keep separate copies of the journal list.
