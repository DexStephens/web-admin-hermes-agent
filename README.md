# web-admin-hermes-agent

You have exactly 2 weeks (14 days) to build and deploy a functional multi-agent AI assistant using the Hermes framework, accompanied by a user-friendly web dashboard. This test evaluates your understanding of agentic workflows, multi-channel I/O, vision models, UI development, system security, and your ability to ship working software. Upon accepting this contract, we will immediately schedule a 30-60 minute project review call to take place at the end of your 2-week period.

Provided:

- openrouter api token
- GHL sub-account and api token

Key Requirement

- Live, deployed to the cloud
- Github repo with deployment documentation
- Brief document outlining 3rd proposed sub-agent for small businesses

Agent Requirements

- Strict Communication SLAs: must respond to telegram messages in real-time, must parse and reply to forwarded email threads in 15 mins or less. Architect my own email parsing/sending solution
- Web Admin Portal: user-friendly web ui for non-technical users to view chat histories, track API usage/costs, and add/remove Hermes skills. Any tech stack I prefer
- Hermes Skill Vetting: security mechanism that automatically vets and prevents malicious skills from being downloaded or executed by the hermes instance
- Persistent memoty: maintain long-term memory of previous interactions without context window compaction issues
- Model Routing: use gemini 2.5 flash for simple tasks and escalate to sonnet 4.6/opus 4.6 for complex reasoning
- Sub-Agent 1: GHL CRM: sub agent that uses GHL API endpoints to update contact records and manage CRM data
- Sub-agent 2: Book keeping: sub-agent that extracts data from a receipt image, asks clarifying questions, and appends the categorized data to a google sheet via api
- Sub-agent 3: Concept: propose 1 additional useful sub-agent specifically designed to benefit small business owners

User story

1. As a user, I want instant replies on Telegram so the chat feels natural. -> Send a message to the deployed Telegram bot. -> Assistant replies via Telegram with its persona introduction instantaneously. -> Tests real-time webhook/polling.
2. As a user, I want to forward an email to the assistant and have it reply in the thread quickly. -> Forward an existing email thread to the agent's email address. -> Assistant parses the context and replies directly to the thread in < 15 minutes.
3. As a user, I want the assistant to remember my previous messages over time. -> 1. Tell assistant a fact. 2. Send 20+ unrelated messages. 3. Ask about the fact. -> Assistant correctly answers the fact without token limit or compaction errors. -> Tests memory persistence.
4. As a user, I want a Bookkeeping sub-agent to process receipt images and log them to Google Sheets. -> Send a receipt photo via Telegram. Reply with "Client Meals" when asked for the category. -> Agent extracts Amount/Vendor, asks for the category, and successfully appends a new row to the Google Sheet. -> Tests Vision LLM capabilities and Sheets API.
5. As an admin, I want a web dashboard to monitor the agent's activity. -> Log into the provided Admin Web Portal URL. -> Dashboard loads successfully, displaying clear navigation for chat history and settings. -> Must be non-technical friendly.
6. As an admin, I want to view API usage and chat logs to monitor costs and interactions. -> Navigate to the Chat History and API Usage tabs in the portal. -> Shows a readable history of all chats and a metric of LLM tokens/costs used.
7. As an admin, I want to add or remove skills visually without touching code. -> Toggle a specific skill off in the portal, then ask the bot to use it. -> The bot refuses or fails to use the skill because it was disabled via the UI. -> Tests dynamic skill loading.
8. As a system admin, I want to prevent malicious skills from compromising my server. -> Attempt to add a mock skill containing an unauthorized os.system command. -> The vetting system flags the code as malicious, blocks the installation, and logs the event. -> Crucial security check.
9. As a system admin, I want dynamic routing via OpenRouter to save costs on simple tasks. -> Ask a basic math question, then ask a complex logic question. -> Logs confirm the first request used Gemini Flash and the second escalated to Sonnet/Opus.
10. As a system admin, I want a GHL sub-agent to automatically update my CRM. -> Tell the agent via Telegram: "Update John Doe's phone number to 555-0199". -> Agent uses the GHL API to locate the contact and update the field.
11. As an owner, I want to understand the developer's technical capabilities and problem-solving approach. -> Attend the 30-60 min live handoff call at the end of the 14 days. -> Developer clearly walks through the code, explains their architecture, and articulates how they overcame challenges. -> Validates communication and technical depth.

My Questions

- Which way do I surface the agent? CLI, Gateway, cron, batch, API
- How do I make sure the hermes agent can update skills over time (skills + memory + persona) How can we tie user behavior through the telegram allowed users
- How to implement progressive disclosure of skills
- How to implement context compression
- How to implement testing with Hermes and evaluate the performance over time, is there a way I can fake acting as multiple different users
- What is the difference between plugins and hooks?
- How do I truly "call" the hermes agent if it lives in docker or cli? Do I have a custom python app on the server as well? IDK

Google Cloud Setup (Is this possible to automate out of curiousity?)

- Create Project
- Enable Google Sheets API in the Project
- Create Google Sheet and pull Sheet ID from the URL
- Create Service User and add as editor to the sheet, create JSON key for service account user

Stretch Goal

- Have sheet with multiple spreadsheets on a per user basis

NEXT STEPS

1. Get hermes bundled to a docker container to reduce all the cli issues I am running into, understand the deployment, how to rerun after changes, etc.
2. Get the MCP for GHL setup and working successfully
3. Build the email parser
4. Ability to add skills
5. Ability to toggle skills
6. Block malicious skill adding
7. Dynamic model routing
8. Understand message compaction, and how history works
9. Deploy to a live URL, setup via terraform on digital ocean
10. How do we dynacmially add new people to the telegram allowed users list?
