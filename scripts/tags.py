"""Map OpenAlex subfields to Google Scholar subcategory tags via a crosswalk."""

# OpenAlex lists a source's subfields in order of prominence, so the leading
# entries are the journal's dominant disciplines. Journals average ~13 mapped
# subfields, most of them incidental; keeping only the leaders keeps the browse
# filter trustworthy (and the index small) without dropping any journal.
MAX_TAGS = 3


def tags_for(subfields: list[dict], crosswalk: dict, max_tags: int = MAX_TAGS) -> list[str]:
    tags: list[str] = []
    for sf in subfields:
        tag = crosswalk.get(sf.get("id"))
        if tag and tag not in tags:
            tags.append(tag)
            if len(tags) >= max_tags:
                break
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
