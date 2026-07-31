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
    # Accumulate each subfield's article count across the topics that roll up to
    # it, then order by count. OpenAlex's raw topic order is by count too, but a
    # single subfield is often split across several topics; summing first is what
    # separates a journal's real disciplines from incidental ones.
    subfields: list[dict] = []
    by_id: dict[str, dict] = {}
    for t in rec.get("topics") or []:
        sf = t.get("subfield") or {}
        sid = _short_id(sf.get("id"))
        if not sid:
            continue
        count = t.get("count") or 0
        if sid in by_id:
            by_id[sid]["count"] += count
        else:
            entry = {"id": sid, "name": sf.get("display_name"), "count": count}
            by_id[sid] = entry
            subfields.append(entry)
    subfields.sort(key=lambda s: s["count"], reverse=True)
    return {
        "name": rec.get("display_name"),
        "issn_l": issn_l,
        "issns": issns,
        "publisher": _short_id(rec.get("host_organization")),
        "publisher_name": rec.get("host_organization_name"),
        "works_count": rec.get("works_count") or 0,
        "subfields": subfields,
    }
