"""Map OpenAlex subfields to Google Scholar subcategory tags via a crosswalk."""

def tags_for(subfields: list[dict], crosswalk: dict) -> list[str]:
    """Map a journal's subfields (already ordered by article count) to GS tags.

    Every mapped tag is kept. Capping to the leading few was tried and reverted:
    OpenAlex's per-topic subfield labels are noisy at the head, so a cap locked
    in the noise and made flagship journals unfindable (The Lancet resolved to
    aerospace/economics/transport and vanished from every medical category).
    Tag strings are interned to integer ids at build time, so keeping the full
    list costs little.
    """
    tags: list[str] = []
    for sf in subfields:
        tag = crosswalk.get(sf.get("id"))
        if tag and tag not in tags:
            tags.append(tag)
    return tags


def intern_tags(tags: list[str], tag_ids: dict) -> list[int]:
    """Convert tag slugs to integer ids, assigning new ids as they appear."""
    out: list[int] = []
    for t in tags:
        if t not in tag_ids:
            tag_ids[t] = len(tag_ids)
        out.append(tag_ids[t])
    return out


def apply_tags(index, records_by_issn, crosswalk):
    """Mutate index entries' `tags` field using each record's subfields.

    `index` is a list of dict entries keyed by ISSN (entry must contain an
    `issn` field matching keys in `records_by_issn`); `records_by_issn` maps
    ISSN -> record dict containing a `subfields` list.
    """
    for entry in index:
        issn = entry.get("issn")
        record = records_by_issn.get(issn)
        subfields = record.get("subfields", []) if record else []
        entry["tags"] = tags_for(subfields, crosswalk)
    return index
