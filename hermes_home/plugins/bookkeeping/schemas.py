LOG_RECEIPT = {
    "name": "log_receipt",
    "description": "Append an extracted receipt (vendor, amount, category) as a row to the bookkeeping sheet.",
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
