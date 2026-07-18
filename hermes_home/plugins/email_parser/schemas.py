PARSE_FORWARDED_EMAIL = {
    "name": "parse_forwarded_email",
    "description": "Parse a forwarded email thread into structured fields (sender, subject, body).",
    "parameters": {
        "type": "object",
        "properties": {
            "raw_email": {
                "type": "string",
                "description": "The raw forwarded email text (headers + body)."
            }
        },
        "required": ["raw_email"]
    }
}
