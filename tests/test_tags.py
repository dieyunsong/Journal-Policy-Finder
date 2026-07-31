from scripts.tags import tags_for, intern_tags

CROSSWALK = {
    "2208": "engineering-computer-science/electrical-electronic-engineering",
    "1202": "humanities-literature-arts/history",
    "1101": "life-sciences-earth-sciences/geology",
    "1102": "physics-mathematics/astronomy-astrophysics",
}

def test_maps_subfields_to_tags():
    subfields = [{"id": "2208", "name": "Electrical and Electronic Engineering"}]
    assert tags_for(subfields, CROSSWALK) == ["engineering-computer-science/electrical-electronic-engineering"]

def test_skips_unmapped_and_dedupes():
    subfields = [{"id": "2208", "name": "x"}, {"id": "2208", "name": "x"}, {"id": "9999", "name": "unknown"}]
    assert tags_for(subfields, CROSSWALK) == ["engineering-computer-science/electrical-electronic-engineering"]


def test_keeps_every_mapped_tag_no_cap():
    # A cap was tried and reverted: it hid flagship journals from their real
    # discipline. All mapped subfields must survive.
    subfields = [{"id": i, "name": "x"} for i in ("2208", "1202", "1101", "1102")]
    assert len(tags_for(subfields, CROSSWALK)) == 4

def test_intern_tags_assigns_stable_ids():
    tag_ids = {}
    assert intern_tags(["a", "b", "a"], tag_ids) == [0, 1, 0]
    assert intern_tags(["b", "c"], tag_ids) == [1, 2]
    assert tag_ids == {"a": 0, "b": 1, "c": 2}
