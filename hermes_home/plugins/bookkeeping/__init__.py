import json
import os

from google.oauth2 import service_account
from googleapiclient.discovery import build

from . import schemas

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SHEET_RANGE = "Sheet1!A:C"

_sheets_service = None


def _get_sheets_service():
    global _sheets_service
    if _sheets_service is None:
        credentials = service_account.Credentials.from_service_account_file(
            os.environ["GOOGLE_SERVICE_ACCOUNT_FILE"], scopes=SCOPES
        )
        _sheets_service = build("sheets", "v4", credentials=credentials)
    return _sheets_service


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
    ctx.register_tool(
        name="log_receipt",
        toolset="bookkeeping",
        schema=schemas.LOG_RECEIPT,
        handler=log_receipt,
    )
