LOG_RECEIPT = {
    "name": "log_receipt",
    "description": (
        "Append a receipt (vendor, amount, category) as a row to the "
        "bookkeeping sheet. Only call this after the user has explicitly "
        "confirmed or corrected the category in chat — never log a "
        "category they haven't seen and approved."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "vendor": {
                "type": "string",
                "description": "The vendor/merchant name on the receipt."
            },
            "amount": {
                "type": "number",
                "description": "The total amount on the receipt."
            },
            "category": {
                "type": "string",
                "description": "The expense category, e.g. 'Client Meals', 'Office Supplies'."
            }
        },
        "required": ["vendor", "amount", "category"]
    }
}

EXTRACT_RECEIPT = {
    "name": "extract_receipt",
    "description": (
        "Read a receipt image with a vision model and extract the vendor, "
        "amount, and a suggested expense category. Call this first whenever "
        "the user shares a receipt photo. This does NOT write anything to "
        "the spreadsheet — after calling it, show the user the vendor, "
        "amount, and suggested category, and get their explicit confirmation "
        "or correction of the category before calling log_receipt."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "image_url": {
                "type": "string",
                "description": "The receipt image to read: an http(s) URL, a local file path, or a data: URL — same format accepted by vision_analyze."
            }
        },
        "required": ["image_url"]
    }
}

EXTRACT_RECEIPT_RESULT_SCHEMA = {
    "type": "object",
    "properties": {
        "vendor": {"type": "string"},
        "amount": {"type": "number"},
        "suggested_category": {"type": "string"},
        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
    },
    "required": ["vendor", "amount", "suggested_category"]
}
