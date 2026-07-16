"""Resolve + validate journal-level website URLs per publisher.

Output: work/journal-links.csv with
  eISSN, Publisher, Journal Title, journal_url, method, flag
Methods: pattern-validated (curl 200 + host check), openalex-validated,
crossref-checked (Wiley), blank (with flag/reason).
Never guesses from titles. Rate-limited.
"""
import csv, json, re, subprocess, time
from collections import defaultdict
from urllib.parse import urlparse

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 journal-policy-finder"

def head(url, timeout=25):
    p = subprocess.run(["curl", "-sS", "-o", "/dev/null", "-w", "%{http_code} %{url_effective}",
                        "--max-time", str(timeout), "-A", UA, "-L", url],
                       capture_output=True, text=True)
    parts = p.stdout.strip().split(" ", 1)
    return (parts[0] if parts else "000"), (parts[1] if len(parts) > 1 else "")

def crossref_publisher(issn):
    p = subprocess.run(["curl", "-sS", "--max-time", "25",
                        "-A", "journal-policy-finder (mailto:songdieyun@gmail.com)",
                        f"https://api.crossref.org/journals/{issn}"],
                       capture_output=True, text=True)
    try:
        return json.loads(p.stdout)["message"].get("publisher", "")
    except Exception:
        return None

base = list(csv.reader(open("work/base-journals.csv", encoding="utf-8")))[1:]
oa = defaultdict(list)
for line in open("work/openalex.jsonl"):
    r = json.loads(line)
    for i in (r.get("issn") or []):
        oa[i].append(r)

def norm(t):
    return re.sub(r"[^a-z0-9]+", "", t.lower())

out = open("work/journal-links.csv", "w", encoding="utf-8", newline="")
w = csv.writer(out, lineterminator="\n")
w.writerow(["eISSN", "Publisher", "Journal Title", "journal_url", "method", "flag"])

n = 0
for pub, title, issn in base:
    n += 1
    issn = issn.strip()
    url, method, flag = "", "", ""
    rec = (oa.get(issn) or [None])[0]
    oa_home = (rec.get("homepage_url") or "") if rec else ""
    oa_title = (rec.get("display_name") or "") if rec else ""
    title_ok = rec is not None and (norm(oa_title) == norm(title)
                                    or norm(title) in norm(oa_title)
                                    or norm(oa_title) in norm(title))

    if issn == "[conference proceedings]":
        method, flag = "skip", "conference proceedings; see ACM publisher pages"
    elif not issn:
        method, flag = "skip", "no eISSN in source data"
    elif pub == "Wiley":
        cp = crossref_publisher(issn)
        time.sleep(0.25)
        if cp and ("wiley" in cp.lower() or "hindawi" in cp.lower()):
            url = "https://onlinelibrary.wiley.com/journal/" + issn.replace("-", "")
            method = f"eISSN pattern; Crossref publisher: {cp}"
        else:
            method, flag = "blank", f"Crossref publisher is {cp!r}, not Wiley - not linked"
    elif pub == "Springer Nature":
        m = re.search(r"(?:springer\.com|springerlink\.com)/journal/(\d+)", oa_home) or \
            re.search(r"springer\.com.*?/journal/(\d+)", oa_home)
        if m:
            cand = f"https://link.springer.com/journal/{m.group(1)}"
        elif "nature.com" in oa_home:
            cand = oa_home
        else:
            cand = ""
        if cand and title_ok:
            code, eff = head(cand); time.sleep(0.35)
            if code == "200":
                url, method = eff or cand, "openalex id -> validated 200"
            else:
                method, flag = "blank", f"candidate {cand} returned {code}"
        else:
            method, flag = "blank", ("openalex title mismatch: " + oa_title if (cand and not title_ok)
                                     else "no journal id found")
    elif pub == "Cambridge University Press":
        m = re.search(r"cambridge\.org/core/journals/([a-z0-9-]+)", oa_home)
        cand = f"https://www.cambridge.org/core/journals/{m.group(1)}" if m else (oa_home or "")
        if cand and ("cambridge.org" in cand or "journals.cambridge.org" in cand) and title_ok:
            code, eff = head(cand); time.sleep(0.35)
            if code == "200" and "cambridge.org" in eff:
                url, method = eff, "openalex slug -> validated 200"
            else:
                method, flag = "blank", f"candidate returned {code}"
        else:
            method, flag = "blank", ("openalex title mismatch: " + oa_title if cand and not title_ok
                                     else "no cambridge slug found")
    elif pub == "Institute of Physics (IOP)":
        cand = f"https://iopscience.iop.org/journal/{issn}"
        code, eff = head(cand); time.sleep(0.35)
        if code == "200":
            url, method = eff or cand, "eISSN pattern -> validated 200"
        elif "iopscience" in oa_home and title_ok:
            code2, eff2 = head(oa_home); time.sleep(0.35)
            if code2 == "200":
                url, method = eff2 or oa_home, "openalex homepage -> validated 200"
            else:
                method, flag = "blank", f"pattern {code}, openalex {code2}"
        else:
            method, flag = "blank", f"pattern returned {code}"
    elif pub == "American Chemical Society (ACS)":
        m = re.search(r"pubs\.acs\.org/journal/([a-z0-9]+)", oa_home)
        if m and title_ok:
            url = f"https://pubs.acs.org/journal/{m.group(1)}"
            method = "openalex code (pubs.acs.org blocks bots; title cross-checked)"
        else:
            method, flag = "blank", ("openalex title mismatch: " + oa_title if m
                                     else "no ACS journal code in openalex")
    elif pub == "Association of Computing Machinery (ACM)":
        method, flag = "blank", "see ACM Digital Library (dl.acm.org); publisher-level policies apply"
    else:
        # small publishers: handled manually later
        method, flag = "manual", oa_home
    w.writerow([issn, pub, title, url, method, flag])
    if n % 500 == 0:
        print(f"{n}/{len(base)}", flush=True)
        out.flush()

out.close()
print("done", flush=True)
