import base64
import json
import mimetypes
import os
from pathlib import Path

import httpx
from google.oauth2 import service_account
from googleapiclient.discovery import build

from agent.plugin_llm import PluginLlmImageInput, PluginLlmTextInput
from tools.registry import tool_error

from . import schemas

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SHEET_RANGE = "Sheet1!A:C"

_sheets_service = None
_ctx = None  # PluginContext, set by register() — gives extract_receipt access to ctx.llm


def _get_sheets_service():
    global _sheets_service
    if _sheets_service is None:
        credentials = service_account.Credentials.from_service_account_file(
            os.environ["GOOGLE_SERVICE_ACCOUNT_FILE"], scopes=SCOPES
        )
        _sheets_service = build("sheets", "v4", credentials=credentials)
    return _sheets_service


def _load_image_bytes(image_url: str) -> tuple[bytes, str]:
    """Resolve image_url (data: URL, http(s) URL, or local file path) to (bytes, mime_type).

    Mirrors the image_url convention used by the built-in vision_analyze tool
    so callers can pass whatever reference the agent already has for an
    image (a cached local path, a data URL, or a plain http(s) URL).
    """
    if image_url.startswith("data:"):
        header, _, b64data = image_url.partition(",")
        mime_type = "image/png"
        if ";base64" in header:
            mime_type = header[len("data:"):header.index(";")] or "image/png"
        return base64.b64decode(b64data), mime_type

    if image_url.startswith("http://") or image_url.startswith("https://"):
        resp = httpx.get(image_url, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        mime_type = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        return resp.content, mime_type or "image/jpeg"

    path = Path(image_url).expanduser()
    data = path.read_bytes()
    mime_type = mimetypes.guess_type(str(path))[0] or "image/jpeg"
    return data, mime_type


def extract_receipt(args: dict, **kwargs) -> str:
    print(f"[TOOL CALLED] extract_receipt args={args}")

    image_url = (args.get("image_url") or "").strip()
    if not image_url:
        return tool_error("extract_receipt requires image_url")

    try:
        image_bytes, mime_type = _load_image_bytes(image_url)
    except Exception as exc:
        return tool_error(f"Could not load image: {exc}")

    if _ctx is None:
        return tool_error("Plugin context unavailable — extract_receipt was not registered correctly")

    try:
        result = _ctx.llm.complete_structured(
            instructions=(
                "You are reading a receipt image for a bookkeeping tool. "
                "Extract the vendor/merchant name, the total amount charged, "
                "and suggest an expense category (e.g. 'Client Meals', "
                "'Office Supplies', 'Travel', 'Software'). If the amount or "
                "vendor is unclear, make your best reading and note it via a "
                "low confidence rather than failing."
            ),
            input=[
                PluginLlmImageInput(data=image_bytes, mime_type=mime_type, file_name="receipt"),
                PluginLlmTextInput(text="Extract the receipt fields as JSON."),
            ],
            json_schema=schemas.EXTRACT_RECEIPT_RESULT_SCHEMA,
            schema_name="extract_receipt_result",
            purpose="bookkeeping.extract_receipt",
        )
    except Exception as exc:
        return tool_error(f"Vision extraction failed: {exc}")

    if result.parsed is None:
        return tool_error("Vision model did not return valid structured output", raw=result.text)

    parsed = result.parsed
    return json.dumps({
        "status": "ok",
        "vendor": parsed.get("vendor"),
        "amount": parsed.get("amount"),
        "suggested_category": parsed.get("suggested_category"),
        "confidence": parsed.get("confidence", "medium"),
        "note": "Not logged yet — confirm or correct the category with the user before calling log_receipt.",
    })


def log_receipt(args: dict, **kwargs) -> str:
    print(f"[TOOL CALLED] log_receipt args={args}")

    vendor = args.get("vendor")
    amount = args.get("amount")
    category = args.get("category")

    try:
        service = _get_sheets_service()
        service.spreadsheets().values().append(
            spreadsheetId=os.environ["BOOKKEEPING_SPREADSHEET_ID"],
            range=SHEET_RANGE,
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body={"values": [[vendor, amount, category]]},
        ).execute()
    except Exception as exc:
        return json.dumps({"status": "error", "error": str(exc), "received": args})

    return json.dumps({
        "status": "ok",
        "message": f"Logged {vendor} / {amount} / {category} to the sheet.",
        "received": args,
    })


def register(ctx):
    global _ctx
    _ctx = ctx

    ctx.register_tool(
        name="extract_receipt",
        toolset="bookkeeping",
        schema=schemas.EXTRACT_RECEIPT,
        handler=extract_receipt,
    )
    ctx.register_tool(
        name="log_receipt",
        toolset="bookkeeping",
        schema=schemas.LOG_RECEIPT,
        handler=log_receipt,
    )
