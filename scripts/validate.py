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

def validate_publisher_ids(publishers: dict, index: list) -> list[str]:
    """Flag curated publisher ids (and aliases) that match no journal.

    Curated entries are keyed by hand-resolved OpenAlex ids. A wrong id joins to
    nothing and the publisher silently falls back to the uncurated card with no
    error — exactly the failure this catches.
    """
    seen = {e["publisher"] for e in index}
    errs = []
    for pid, p in publishers.items():
        ids = [pid] + list(p.get("aliases") or [])
        if not any(i in seen for i in ids):
            errs.append(
                f"publisher {pid} ({p.get('name')}): id matches no journal in the index "
                f"- check the OpenAlex publisher id"
            )
    return errs


def validate_crosswalk(crosswalk: dict, taxonomy: dict) -> list[str]:
    """Every crosswalk value must be an 'area/subcategory' that exists in the taxonomy.

    A tag with no matching checkbox can never be selected, so journals carrying
    it become unreachable through browse while the build still passes.
    """
    valid = {f"{a}/{s}" for a, ad in taxonomy.items() for s in ad.get("subcategories", {})}
    return [
        f"crosswalk: subfield {sid} maps to '{tag}', which is not in the taxonomy"
        for sid, tag in crosswalk.items()
        if tag not in valid
    ]
