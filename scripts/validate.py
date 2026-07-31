"""Build-time validators. Return lists of human-readable error strings (empty = ok)."""
REQUIRED_PUB_FIELDS = ("homepage", "oa_options", "embargo_sharing", "apc", "note", "verified")

def validate_publishers(publishers: dict) -> list[str]:
    errs = []
    for pid, p in publishers.items():
        for field in REQUIRED_PUB_FIELDS:
            if not p.get(field):
                errs.append(f"publisher {pid}: missing required field '{field}'")
    return errs

def validate_ta(overlay: dict, index: list) -> list[str]:
    known = {e["issn_l"] for e in index}
    return [f"TA overlay: issn_l {k} not present in index" for k in overlay if k not in known]

def validate_index_tags(index: list, crosswalk: dict, allowed_unmapped: set) -> list[str]:
    # Only flags tags that reference a crosswalk value; membership of subfield ids is checked upstream.
    valid_tags = set(crosswalk.values())
    errs = []
    for e in index:
        for t in e.get("tags", []):
            if t not in valid_tags and t not in allowed_unmapped:
                errs.append(f"index {e['issn_l']}: unknown tag '{t}'")
    return errs
