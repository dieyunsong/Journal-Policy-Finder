from scripts.tags import tags_for

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

def test_caps_at_max_tags_keeping_most_prominent_first():
    # OpenAlex returns subfields ordered by prominence; the cap keeps the leaders
    # and drops the incidental long tail (a civil-engineering journal should not
    # surface under astronomy).
    subfields = [
        {"id": "2208", "name": "a"},
        {"id": "1202", "name": "b"},
        {"id": "1101", "name": "c"},
        {"id": "1102", "name": "d"},
    ]
    assert tags_for(subfields, CROSSWALK, max_tags=3) == [
        "engineering-computer-science/electrical-electronic-engineering",
        "humanities-literature-arts/history",
        "life-sciences-earth-sciences/geology",
    ]

def test_default_cap_is_three():
    subfields = [{"id": i, "name": "x"} for i in ("2208", "1202", "1101", "1102")]
    assert len(tags_for(subfields, CROSSWALK)) == 3

def test_cap_does_not_pad_when_fewer_tags():
    subfields = [{"id": "2208", "name": "a"}]
    assert tags_for(subfields, CROSSWALK, max_tags=3) == [
        "engineering-computer-science/electrical-electronic-engineering"
    ]
