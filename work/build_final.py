"""Assemble the final Journal-Policy-Finder CSV.

Inputs:
  work/base-journals.csv        Publisher, Journal Title, eISSN
  work/journal-links.csv        validated per-journal website URLs (big publishers)
  work/publisher-policies.json  verified publisher-level policy pages
Output:
  data/northwestern-agreements.csv  (source of truth for the site)

Columns:
  Publisher, Journal Title, eISSN, eISSN Link, Journal Website,
  Open Access Options, Embargo & Sharing Policy, APC Information, Notes

Rules:
  - Never invent a link. Journal Website only if validator produced one, or a
    verified journal-level pattern for the small publishers below.
  - Policy columns come from the verified publisher map; {code}/{host}/{slug}
    placeholders are filled per-journal from that map's lookup tables.
  - Anything unresolved is left blank; the Notes column explains why.
"""
import csv, json, re
from urllib.parse import urlparse, urlunparse

ISSN_PORTAL = "https://portal.issn.org/resource/ISSN/"
POL = json.load(open("work/publisher-policies.json"))

# validated journal URLs keyed by (publisher, eissn)
jl = {}
for issn, pub, title, url, method, flag in list(csv.reader(open("work/journal-links.csv", encoding="utf-8")))[1:]:
    jl[(pub, issn)] = (url.strip(), flag.strip())

def clean(url):
    """Strip tracking/cookie query strings; keep path + fragment."""
    if not url:
        return url
    p = urlparse(url)
    return urlunparse((p.scheme, p.netloc, p.path, "", "", p.fragment))

def fill(template, issn, pubmap):
    """Resolve {code}/{host}/{slug} in a policy template for a small publisher."""
    if not template or "{" not in template:
        return template
    for key, tbl in (("{code}", "journal_codes"), ("{host}", "journal_hosts"),
                      ("{slug}", "journal_slugs")):
        if key in template:
            code = (pubmap.get(tbl) or {}).get(issn)
            if not code:
                return ""  # no verified per-journal code -> no link
            template = template.replace(key, code)
    return template

base = list(csv.reader(open("work/base-journals.csv", encoding="utf-8")))[1:]
out = [["Publisher", "Journal Title", "eISSN", "eISSN Link", "Journal Website",
        "Open Access Options", "Embargo & Sharing Policy", "APC Information", "Notes"]]

for pub, title, issn in base:
    issn = issn.strip()
    pubmap = POL.get(pub, {})
    eissn_disp = "" if issn == "[conference proceedings]" else issn
    eissn_link = ISSN_PORTAL + issn if re.fullmatch(r"\d{4}-\d{3}[\dX]", issn) else ""

    # journal website
    jurl, jflag = jl.get((pub, issn), ("", ""))
    website = clean(jurl)

    # policy columns (fill per-journal placeholders where needed)
    oa = fill(pubmap.get("oa_options", ""), issn, pubmap)
    emb = fill(pubmap.get("embargo_sharing", ""), issn, pubmap)
    apc = fill(pubmap.get("apc", ""), issn, pubmap)

    # notes: start from publisher note, append per-row caveat if link is blank
    notes = pubmap.get("note", "")
    extra = []
    if not website:
        if issn == "[conference proceedings]":
            extra.append("Conference-proceedings series; no journal eISSN - see ACM Digital Library.")
        elif jflag and not jflag.startswith("see ACM"):
            extra.append("Journal website not linked: " + jflag + ".")
    if extra:
        notes = (notes + " " if notes else "") + " ".join(extra)

    out.append([pub, title, eissn_disp, eissn_link, website, oa, emb, apc, notes])

with open("data/northwestern-agreements.csv", "w", encoding="utf-8", newline="") as f:
    csv.writer(f, lineterminator="\n").writerows(out)

# quick report
from collections import Counter
tot = len(out) - 1
cols = {i: sum(1 for r in out[1:] if r[i].strip()) for i in range(4, 8)}
print(f"wrote {tot} rows")
names = ["", "", "", "", "Journal Website", "OA Options", "Embargo/Sharing", "APC Info"]
for i in range(4, 8):
    print(f"  {names[i]:16} filled: {cols[i]}/{tot} ({100*cols[i]//tot}%)")
