PARSE_FORWARDED_EMAIL = {
    "name": "parse_forwarded_email",
    "description": (
        "Check the inbox for unread forwarded emails and draft + send a reply to "
        "each one. Reads the subject, body, and any attachments — image "
        "attachments are analyzed with vision, other attachment types are noted "
        "by name/type/size since their contents can't be read. Call this when "
        "the user asks to process, triage, or respond to forwarded/unread email."
    ),
    "parameters": {
        "type": "object",
        "properties": {},
        "required": []
    }
}

CREATE_REPLY_RESULT_SCHEMA = {
    "type": "object",
    "properties": {
        "subject": {
            "type": "string",
            "description": "Subject line for the reply email."
        },
        "body": {
            "type": "string",
            "description": "Plain-text body of the reply email."
        }
    },
    "required": ["subject", "body"]
}
