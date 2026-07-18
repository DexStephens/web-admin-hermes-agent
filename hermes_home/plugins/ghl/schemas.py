GHL_UPDATE_CONTACT = {
    "name": "ghl_update_contact",
    "description": "Update a field on a GoHighLevel CRM contact record.",
    "parameters": {
        "type": "object",
        "properties": {
            "contact_name": {
                "type": "string",
                "description": "The name of the contact to update."
            },
            "field": {
                "type": "string",
                "description": "The contact field to update, e.g. phone, email."
            },
            "value": {
                "type": "string",
                "description": "The new value for the field."
            }
        },
        "required": ["contact_name", "field", "value"]
    }
}
