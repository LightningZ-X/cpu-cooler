"""Collect public publication metadata, not video playback or benchmark results.

Run manually: python tools/collect-51972.py
Stops on API errors; no cookies, account credentials, or media downloads.
"""

import datetime as dt
import json
import math
from pathlib import Path
import re
import sys
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
MID = 64391344
ZONE = dt.timezone(dt.timedelta(hours=8))


def fetch(page):
    url = f"https://api.bilibili.com/x/space/arc/search?mid={MID}&ps=50&pn={page}&order=pubdate"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        result = json.load(response)
    if result.get("code") != 0:
        raise RuntimeError(f"Archive page {page}: API code {result.get('code')}")
    return result["data"]


def classify(title):
    if re.search(r"风冷|水冷|散热器|冷头|散热性能|散热.*测试|散热.*影响", title):
        return "cooling"
    if re.search(r"风扇|直叶扇|曲叶扇|叶形|扇形", title):
        return "fan"
    if re.search(r"主板|B760|Z790|Z890|B860|机箱|O11|EVOLV", title, re.I):
        return "installation"
    return "other"


def main():
    cache = ROOT / 'research' / 'archive.json'
    first = json.loads(cache.read_text(encoding='utf-8'))['data'] if cache.exists() else fetch(1)
    count = first["page"]["count"]
    videos = list(first["list"]["vlist"])
    failures = []
    for page in range(2, math.ceil(count / 50) + 1):
        try:
            videos.extend(fetch(page)["list"]["vlist"])
        except Exception as error:
            failures.append({'page':page,'error':str(error)})
            break
        print(f"Fetched page {page}", flush=True)
    ids = [video["bvid"] for video in videos]
    if len(set(ids)) != len(ids):
        raise RuntimeError("Duplicate archive IDs. Review before replacing the saved inventory.")
    entries = []
    for video in videos:
        if video["mid"] != MID:
            raise RuntimeError("Unexpected uploader")
        entries.append({
            "bvid": video["bvid"],
            "title": video["title"],
            "publishedAt": dt.datetime.fromtimestamp(video["created"], ZONE).isoformat(),
            "duration": video["length"],
            "category": classify(video["title"]),
            "url": f"https://www.bilibili.com/video/{video['bvid']}/",
            "descriptionExcerpt": video.get("description", "")[:160],
            "reviewStatus": "metadata-only",
        })
    payload = {
        "author": "51972", "uid": MID,
        "profile": f"https://space.bilibili.com/{MID}",
        "collectedAt": dt.datetime.now(ZONE).isoformat(),
        "reportedCount": count, "collectedCount": len(entries),
        "publicArchiveComplete": len(set(ids)) == count,
        "failures": failures,
        "scope": "当前公开投稿目录；不包括删除、隐藏及无法公开访问的内容。已读取标题与简介，未逐一阅览视频画面。",
        "classification": "标题关键词初筛，可能存在漏分；可切换全部目录人工检查。",
        "videos": entries,
    }
    target = ROOT / "data" / "reviews" / "51972-videos.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    related = [video for video in entries if video["category"] != "other"]
    print(json.dumps({"total": count, "relatedByTitle": len(related), "path": str(target)}, ensure_ascii=False))
    for video in related:
        print(video["bvid"], video["publishedAt"][:10], video["title"])


if __name__ == "__main__":
    main()
