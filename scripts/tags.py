"""Map OpenAlex subfields to Google Scholar subcategory tags via a crosswalk."""

def tags_for(subfields: list[dict], crosswalk: dict) -> list[str]:
    tags: list[str] = []
    for sf in subfields:
        tag = crosswalk.get(sf.get("id"))
        if tag and tag not in tags:
            tags.append(tag)
    return tags


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
