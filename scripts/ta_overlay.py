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
