# Publisher card curation

This directory documents how `data/publishers.json` is produced and reviewed.
`data/publishers.json` is the curated, human-verified layer that `scripts/build.py`
joins onto the journal index (by each journal's `publisher` field) to render a
publisher-specific policy card instead of the generic fallback card.

## Schema

`data/publishers.json` is a JSON object keyed by **OpenAlex publisher short id**
— the trailing path segment of the `host_organization` URL on an OpenAlex
source record (e.g. the source record's `host_organization` is
`https://openalex.org/P4310320595`, so the key is `"P4310320595"`). This is
exactly the value `scripts/openalex.py::parse_source` puts in each journal's
`publisher` field, and it is what `scripts/build.py` uses to join
`data/publishers.json` onto the journal index. **Using the wrong id silently
breaks the join** — the journal will just fall back to the generic card with
no error, so there's nothing that fails loudly if a key is wrong. Always
resolve the id by querying OpenAlex for a real source in that publisher
(e.g. `GET https://api.openalex.org/sources/issn:<eissn>` and read
`host_organization`), never by guessing or by matching on name alone.

Each value is an object with exactly these fields (all required —
`scripts/validate.py::validate_publishers` rejects any entry missing one):

```json
{
  "name": "Human-readable publisher name",
  "homepage": "https://publisher-main-site.example",
  "oa_options": "https://.../open-access-overview-page",
  "embargo_sharing": "https://.../self-archiving-or-green-oa-page",
  "apc": "https://.../apc-or-fees-page",
  "note": "One or two sentences of caveats a user should know.",
  "verified": "YYYY-MM-DD"
}
```

- `name` — display name for the card header. Matching the source data's
  `Publisher` column (e.g. `data/northwestern-agreements.csv`) is fine.
- `homepage` — the publisher's main website. New in this schema (the old
  `work/publisher-policies.json` format didn't carry it).
- `oa_options`, `embargo_sharing`, `apc` — publisher-level (not per-journal)
  pages. A single page may legitimately serve more than one field if the
  publisher documents multiple topics on one page (several entries in the
  seed reuse the same URL for `oa_options` and `apc`, matching how the
  publisher itself organizes the information).
- `note` — a short caveat surfaced in the UI. At minimum it should state the
  green-OA embargo length and the OA model(s) available (gold/hybrid/green),
  and call out anything a link's target doesn't fully cover (e.g. "APC varies
  by journal, see the journal's own page").
- `verified` — an **ISO 8601 date**, set to the day a human actually opened
  and confirmed all three links resolve to the right content. This is not a
  data-entry timestamp; it must be updated whenever the entry is re-reviewed
  or the links change.

## The "grounded or blank" rule

**Never guess a policy URL, and never leave a placeholder in a committed
entry.** If a genuine publisher-level page can't be found for one of
`oa_options` / `embargo_sharing` / `apc`:

1. First look for the publisher's site landing page and use it as a fallback
   for that one field (a landing page that at least gets the user to the
   right site is better than a fabricated deep link).
2. If even a reasonable fallback can't be found or confirmed, **omit the
   publisher from `data/publishers.json` entirely.** A publisher with no
   entry gets the generic fallback card — that is the intended, safe
   degradation. A publisher with a wrong or fabricated link is worse than no
   entry at all.

This also applies to publishers whose only available policy pages are
**templated per-journal URLs** (e.g. `https://journals.example.com/{code}/pages/open-access`).
A publisher-level card cannot contain an unresolved `{placeholder}` — find a
concrete publisher-level page (a general OA/rights/fees page, or the site
landing page per rule 1 above) instead of shipping the template. Do not
default to a random journal's own instantiation of the template — the
`{code}`/`{host}`/`{slug}` might not be discoverable at build time for every
journal, so the card must not depend on it.

## Review checklist

Before setting `verified` on any entry (new or re-reviewed), confirm:

- [ ] `oa_options` opens and actually describes the publisher's open-access
      routes (gold/hybrid/green), not a login wall or a 404/redirect to an
      unrelated page.
- [ ] `embargo_sharing` opens and actually describes self-archiving / green
      OA / repository deposit terms (not just a generic copyright page).
- [ ] `apc` opens and actually describes article processing charges or a
      fees/pricing overview (a price list, a pricing tool, or an explanation
      of how pricing varies by journal all count).
- [ ] `note` states the green-OA embargo length (or "no embargo" /
      "immediate OA") and names the OA model(s) offered.
- [ ] `homepage` is the publisher's real top-level site (not a specific
      journal's page).
- [ ] The key is the OpenAlex publisher short id verified against a real
      source record (see Schema above), not copied from a test fixture or
      guessed from the name.

Automated bot-protection (Cloudflare/Akamai 403s to non-browser HTTP
clients) on some publisher domains is expected and is not, on its own,
evidence the link is wrong — confirm with a real browser fetch/render, not
just a raw HTTP status code from a script.

## How the seed was produced

The 11 entries in the initial seed came from `work/publisher-policies.json`,
an earlier hand-verified pass (dated 2026-07-15) that used the publisher's
*display name* as its key. To move to the schema above, each of those 11
names was resolved to its OpenAlex publisher short id by picking a
representative eISSN for that publisher from
`data/northwestern-agreements.csv`, querying
`https://api.openalex.org/sources/issn:<eissn>`, and reading
`host_organization`. A few publishers' journals span more than one
`host_organization` (e.g. imprints, sub-societies, or regional entities under
one umbrella); in those cases 15-20 eISSNs were sampled and the id used by
the large majority of that publisher's journals in the CSV was chosen. See
`.superpowers/sdd/task-9-report.md` for the specific ids and eISSNs used.

Three of the 11 (The Company of Biologists, Cold Spring Harbor Laboratory
Press, Cogitatio Press) had templated per-journal URLs in the old data; their
seed entries were rewritten to concrete publisher-level pages per the
"grounded or blank" rule above.

## Drafting the remaining ~189 publishers

The top-200 publisher id list comes from running `rank_publishers` (see
`scripts/rank_publishers.py`) on the real `build/sources.jsonl`. Drafting
entries for the rest of that list is a separate, later effort using
`scripts/curate_publishers.workflow.js` (see that file's header for details):
it fans out per publisher, has an agent search + fetch candidate policy pages
and confirm they return HTTP 200, then drafts a schema object with a `note`,
writing everything to `build/publisher-drafts.json`. **That file is a draft
only.** Every draft must go through the review checklist above and get merged
into `data/publishers.json` by a human, front-loaded on the ~150
highest-volume publishers, before it counts as curated.
