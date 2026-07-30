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
