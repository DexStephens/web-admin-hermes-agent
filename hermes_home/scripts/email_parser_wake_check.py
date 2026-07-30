"""Cron pre-check for the Email Parser job.

Cheaply asks Nylas whether there's any unread mail before the cron
scheduler wakes the full agent. Printing {"wakeAgent": false} as the last
stdout line makes the scheduler skip the agent run entirely (see
_parse_wake_gate in cron/scheduler.py) -- no LLM call, no tokens spent.
Any other output, or a failed check, leaves the gate open so the real
tool call (parse_forwarded_email) is the one that surfaces a hard error
rather than this check going silently dark on a transient failure.
"""
import json
import os
import ssl
import urllib.request

NYLAS_BASE_URL = "https://api.us.nylas.com"


def _ssl_context() -> ssl.SSLContext:
    # urllib's bare default context doesn't always pick up a usable trust
    # store (e.g. python.org framework builds on macOS); certifi's bundle is
    # already a transitive dependency of the nylas/httpx stack this plugin
    # uses, so prefer it when present instead of failing the precheck open
    # on every single tick.
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def main() -> None:
    api_key = os.environ["NYLAS_API_KEY"]
    grant_id = os.environ["NYLAS_GRANT_ID"]

    url = f"{NYLAS_BASE_URL}/v3/grants/{grant_id}/messages?unread=true&limit=5"
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})

    try:
        with urllib.request.urlopen(request, timeout=15, context=_ssl_context()) as response:
            payload = json.load(response)
        unread_count = len(payload.get("data", []))
    except Exception as exc:
        print(json.dumps({"wakeAgent": True, "precheck_error": str(exc)}))
        return

    print(json.dumps({"wakeAgent": unread_count > 0, "unread_count": unread_count}))


if __name__ == "__main__":
    main()
