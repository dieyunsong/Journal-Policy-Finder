"""Resolve journal eISSNs to OpenAlex source records (homepage_url, title, publisher).

Reads work/base-journals.csv, batches unique ISSNs 40 per request against
api.openalex.org/sources, writes work/openalex.jsonl (one record per matched
source). Polite: 1 req/sec, mailto param.
"""
import csv, json, time, subprocess, sys

BASE = "https://api.openalex.org/sources"
MAILTO = "songdieyun@gmail.com"

rows = list(csv.reader(open("work/base-journals.csv", encoding="utf-8")))[1:]
issns = sorted({r[2].strip() for r in rows
                if r[2].strip() and r[2].strip() != "[conference proceedings]"})
print(f"unique ISSNs to resolve: {len(issns)}", flush=True)

out = open("work/openalex.jsonl", "w", encoding="utf-8")
matched = 0
for i in range(0, len(issns), 40):
    batch = issns[i:i+40]
    url = (BASE + "?filter=issn:" + "|".join(batch)
           + "&per-page=200&select=id,display_name,issn,homepage_url,host_organization_name,is_oa,apc_usd"
           + "&mailto=" + MAILTO)
    for attempt in range(3):
        try:
            p = subprocess.run(["curl", "-sS", "--fail", "--max-time", "60",
                                "-A", f"journal-policy-finder (mailto:{MAILTO})", url],
                               capture_output=True, text=True, check=True)
            data = json.loads(p.stdout)
            break
        except Exception as e:
            print(f"batch {i}: attempt {attempt+1} failed: {e}", flush=True)
            time.sleep(5 * (attempt + 1))
    else:
        print(f"batch {i}: GIVING UP", flush=True)
        continue
    for s in data.get("results", []):
        out.write(json.dumps(s) + "\n")
        matched += 1
    time.sleep(1)
out.close()
print(f"done: {matched} source records for {len(issns)} ISSNs", flush=True)
