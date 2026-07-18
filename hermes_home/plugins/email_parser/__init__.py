import json

from . import schemas


def parse_forwarded_email(args: dict, **kwargs) -> str:
    print(f"[TOOL CALLED] parse_forwarded_email args={args}")
    return json.dumps({
        "status": "ok (stub)",
        "sender": "stub@example.com",
        "subject": "Stub subject line",
        "body_summary": "This is a dummy parsed summary of the forwarded email.",
        "received": args,
    })


def register(ctx):
    ctx.register_tool(
        name="parse_forwarded_email",
        toolset="email",
        schema=schemas.PARSE_FORWARDED_EMAIL,
        handler=parse_forwarded_email,
    )
