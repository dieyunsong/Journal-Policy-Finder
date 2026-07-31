// scripts/curate_publishers.workflow.js
//
// ============================================================================
// DRAFT-ONLY WORKFLOW SCRIPT. NOT COMMITTED-CODE-UNDER-TEST.
//
// This is a Claude Workflow, run via the Workflow tool (not `node
// scripts/curate_publishers.workflow.js`, and not exercised by pytest or
// `node:test`). It fans out over the top-200 publisher list produced by
// `scripts/rank_publishers.py` (run against the real `build/sources.jsonl`)
// and drafts a `data/publishers.json`-shaped entry for each one.
//
// OUTPUT IS A DRAFT. Every record this workflow writes to
// `build/publisher-drafts.json` MUST be reviewed by a human against the
// checklist in `docs/curation/README.md` — each of the 3 policy links opens
// to the right page, and `note` states the embargo length + OA model(s) —
// before it is copied into `data/publishers.json`. Nothing this workflow
// produces is merged automatically. Front-load review on the highest-volume
// (top ~150) publishers first; the rest degrade gracefully to the generic
// fallback card until reviewed.
//
// The 11 publishers already in `data/publishers.json` (seeded from
// `work/publisher-policies.json`) are skipped — see `SEEDED_PUBLISHER_IDS`.
// ============================================================================

export const meta = {
  name: "curate_publishers",
  description:
    "Fan out over the top-200 ranked publishers and draft data/publishers.json-shaped " +
    "entries (name, homepage, oa_options, embargo_sharing, apc, note, verified) by " +
    "web-searching and fetching each publisher's OA/embargo/APC policy pages and " +
    "confirming they resolve with HTTP 200. Writes build/publisher-drafts.json for " +
    "human review; never writes data/publishers.json directly.",
  phases: [
    {
      id: "find_candidates",
      description:
        "Per publisher: web-search for its open-access overview page, its self-archiving " +
        "/ green-OA / repository-deposit page, and its APC / publication-fees page. Fetch " +
        "each candidate URL and keep only ones that resolve with HTTP 200. A single URL " +
        "may satisfy more than one of the three if the publisher documents them together.",
    },
    {
      id: "draft_entry",
      description:
        "Per publisher with at least all three fields covered by a confirmed-200 URL, " +
        "draft the schema object: name, homepage, oa_options, embargo_sharing, apc, and a " +
        "note stating the OA model(s) offered and the green-OA embargo length (or 'no " +
        "embargo' / 'immediate OA'). Publishers where a confirmed page could not be found " +
        "for one of the three required links are recorded with a `status: \"incomplete\"` " +
        "marker and left out of the draft's mergeable set — per the grounded-or-blank rule, " +
        "no field is ever filled with a guess.",
    },
    {
      id: "write_drafts",
      description:
        "Merge all drafted entries (keyed by OpenAlex publisher short id) into " +
        "build/publisher-drafts.json, alongside any incomplete/skip records for visibility. " +
        "This file is never read by scripts/build.py — it exists solely for human review.",
    },
  ],
};

// ----------------------------------------------------------------------------
// Below this line is the (non-test-covered) implementation the Workflow host
// executes. It relies on host-provided capabilities (web search + HTTP fetch)
// that are bound by the Workflow runtime, not by this file, and are only
// stubbed here for documentation purposes. This script does not need to run
// outside the Workflow tool.
// ----------------------------------------------------------------------------

// Publisher ids already curated by hand in data/publishers.json (Task 9 seed).
// The workflow skips these so it never clobbers a human-verified entry.
const SEEDED_PUBLISHER_IDS = new Set([
  "P4310320595", // Wiley
  "P4310319900", // Springer Nature
  "P4310319798", // Association of Computing Machinery (ACM)
  "P4310311721", // Cambridge University Press
  "P4310320006", // American Chemical Society (ACS)
  "P4310320083", // Institute of Physics (IOP)
  "P4310320556", // Royal Society of Chemistry
  "P4310320497", // Microbiology Society
  "P4310311847", // The Company of Biologists
  "P4310315909", // Cold Spring Harbor Laboratory Press
  "P4310318509", // Cogitatio Press
]);

const REQUIRED_FIELDS = ["oa_options", "embargo_sharing", "apc"];

/**
 * Stage 1: find + verify candidate policy pages for one publisher.
 * `webSearch` and `webFetch` are host-provided Workflow capabilities.
 *
 * @param {{publisher: string, publisher_name: string}} entry - one row from
 *   rank_publishers() output (the top-200 args this workflow is invoked with).
 * @param {(query: string) => Promise<Array<{title: string, url: string}>>} webSearch
 * @param {(url: string) => Promise<{status: number, url: string}>} webFetch
 * @returns {Promise<{oa_options?: string, embargo_sharing?: string, apc?: string}>}
 */
async function findCandidates(entry, webSearch, webFetch) {
  const name = entry.publisher_name;
  const queries = {
    oa_options: `${name} open access policy publisher`,
    embargo_sharing: `${name} self-archiving green open access embargo policy`,
    apc: `${name} article processing charge APC pricing`,
  };

  const confirmed = {};
  for (const field of REQUIRED_FIELDS) {
    const results = await webSearch(queries[field]);
    for (const result of results) {
      const fetched = await webFetch(result.url);
      if (fetched.status === 200) {
        confirmed[field] = fetched.url; // follow redirects to the final URL
        break;
      }
    }
  }
  return confirmed;
}

/**
 * Stage 2: draft the data/publishers.json-shaped schema object.
 *
 * @param {{publisher: string, publisher_name: string}} entry
 * @param {{oa_options?: string, embargo_sharing?: string, apc?: string}} confirmed
 * @returns {{ id: string, record: object } | { id: string, status: "incomplete", found: object }}
 */
function draftEntry(entry, confirmed) {
  const id = entry.publisher;
  const missing = REQUIRED_FIELDS.filter((f) => !confirmed[f]);
  if (missing.length > 0) {
    // Grounded-or-blank rule: never guess a missing link. Record what was
    // found so a human can finish the entry by hand, but do not mark it
    // mergeable.
    return { id, status: "incomplete", missing, found: confirmed };
  }
  return {
    id,
    record: {
      name: entry.publisher_name,
      homepage: null, // left for human fill-in: not searched for automatically
      oa_options: confirmed.oa_options,
      embargo_sharing: confirmed.embargo_sharing,
      apc: confirmed.apc,
      note:
        "DRAFT — human must confirm embargo length + OA model and replace this note.",
      verified: null, // set only by a human, the day they confirm the links
    },
  };
}

/**
 * Entry point invoked by the Workflow tool.
 *
 * @param {Array<{publisher: string, publisher_name: string, total_works: number, journal_count: number}>} args
 *   the top-200 list, i.e. the output of scripts/rank_publishers.py::rank_publishers().
 * @param {{ webSearch: Function, webFetch: Function, writeFile: (path: string, contents: string) => Promise<void> }} host
 */
export async function run(args, host) {
  const drafts = {};
  const incomplete = [];

  for (const entry of args) {
    if (SEEDED_PUBLISHER_IDS.has(entry.publisher)) continue;

    const confirmed = await findCandidates(entry, host.webSearch, host.webFetch);
    const result = draftEntry(entry, confirmed);

    if (result.status === "incomplete") {
      incomplete.push(result);
    } else {
      drafts[result.id] = result.record;
    }
  }

  const output = {
    _draft_warning:
      "DRAFT OUTPUT. Every entry here requires human verification against " +
      "docs/curation/README.md's review checklist before being copied into " +
      "data/publishers.json. Do not merge automatically.",
    drafts,
    incomplete,
  };

  await host.writeFile(
    "build/publisher-drafts.json",
    JSON.stringify(output, null, 2)
  );

  return { drafted: Object.keys(drafts).length, incomplete: incomplete.length };
}
