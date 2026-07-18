import json

from . import schemas


def ghl_update_contact(args: dict, **kwargs) -> str:
    print(f"[TOOL CALLED] ghl_update_contact args={args}")
    return json.dumps({
        "status": "ok (stub)",
        "message": f"Would have updated {args.get('contact_name')}'s {args.get('field')} to {args.get('value')} in GHL.",
        "received": args,
    })


def register(ctx):
    ctx.register_tool(
        name="ghl_update_contact",
        toolset="ghl",
        schema=schemas.GHL_UPDATE_CONTACT,
        handler=ghl_update_contact,
    )
