#!/usr/bin/env python3
import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_HOSTS = {
    "llm-overview": ("https://llmvis.searchatlas.com", "/api/v1/se/llm-visibility-overview/"),
    "llm-visibility": ("https://llmvis.searchatlas.com", "/api/v1/se/llm-visibility/"),
    "query-response": ("https://llmvis.searchatlas.com", "/api/v1/se/query-response/"),
}


def load_api_key() -> str:
    key = os.environ.get("SEARCHATLAS_API_KEY", "").strip()
    if key:
        return key
    env_path = Path(__file__).resolve().parents[1] / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("SEARCHATLAS_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("SEARCHATLAS_API_KEY is not set.")


def fetch_json(kind: str, params: dict):
    base, path = API_HOSTS[kind]
    url = f"{base}{path}?{urlencode(params)}"
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
            "X-API-Key": load_api_key(),
        },
    )
    with urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")
    print(path)


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"&", "and", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def main():
    parser = argparse.ArgumentParser(description="Fetch Search Atlas SEO and LLM visibility data.")
    sub = parser.add_subparsers(dest="command", required=True)

    p1 = sub.add_parser("llm-overview")
    p1.add_argument("domain")

    p2 = sub.add_parser("llm-visibility")
    p2.add_argument("domain")
    p2.add_argument("--platform")

    p3 = sub.add_parser("query-response")
    p3.add_argument("domain")
    p3.add_argument("platform")
    p3.add_argument("query_id")

    p4 = sub.add_parser("snapshot")
    p4.add_argument("domain")
    p4.add_argument("--out-dir", default="data/searchatlas")

    p5 = sub.add_parser("full-snapshot")
    p5.add_argument("domain")
    p5.add_argument("--out-dir", default="data/searchatlas")

    args = parser.parse_args()

    if args.command == "llm-overview":
        print(json.dumps(fetch_json("llm-overview", {"domain": args.domain}), indent=2))
        return
    if args.command == "llm-visibility":
        params = {"domain": args.domain}
        if args.platform:
            params["platform"] = args.platform
        print(json.dumps(fetch_json("llm-visibility", params), indent=2))
        return
    if args.command == "query-response":
        payload = fetch_json(
            "query-response",
            {"domain": args.domain, "platform": args.platform, "query_id": args.query_id},
        )
        print(json.dumps(payload, indent=2))
        return
    if args.command == "snapshot":
        out_dir = Path(args.out_dir) / args.domain
        overview = fetch_json("llm-overview", {"domain": args.domain})
        visibility = fetch_json("llm-visibility", {"domain": args.domain})
        write_json(out_dir / "llm-overview.json", overview)
        write_json(out_dir / "llm-visibility.json", visibility)
        return
    if args.command == "full-snapshot":
        out_dir = Path(args.out_dir) / args.domain
        overview = fetch_json("llm-overview", {"domain": args.domain})
        visibility = fetch_json("llm-visibility", {"domain": args.domain})
        write_json(out_dir / "llm-overview.json", overview)
        write_json(out_dir / "llm-visibility.json", visibility)

        responses_dir = out_dir / "query-responses"
        response_index = []
        platforms = ["openai", "gemini", "google_ai_mode"]
        for row in visibility if isinstance(visibility, list) else []:
            query = row.get("query", "")
            query_id = row.get("query_id", "")
            if not query_id or not query:
                continue
            slug = slugify(query)
            for platform in platforms:
                try:
                    payload = fetch_json(
                        "query-response",
                        {"domain": args.domain, "platform": platform, "query_id": query_id},
                    )
                except Exception as error:
                    print(f"skip {platform} {query_id}: {error}")
                    continue
                filename = f"{platform}-{slug}.json"
                write_json(responses_dir / filename, payload)
                response_index.append({
                    "platform": platform,
                    "query": query,
                    "query_id": query_id,
                    "file": str((responses_dir / filename).as_posix()),
                })

        manifest = {
            "domain": args.domain,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "overview_file": str((out_dir / "llm-overview.json").as_posix()),
            "visibility_file": str((out_dir / "llm-visibility.json").as_posix()),
            "query_response_count": len(response_index),
            "query_responses": response_index,
        }
        write_json(out_dir / "full-snapshot.json", manifest)
        return


if __name__ == "__main__":
    main()
