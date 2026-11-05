# Paustik help

Guided text help is available to visitors and signed-in users throughout the web app. Role links are selected on the server. Administrators get operations, menus, analytics, accounts, security and evidence links; other roles only get their own workspace links.

Guidance explains procedures. It does not read private records, place orders, change roles, cancel bookings, issue refunds or move money. Existing workspace forms enforce authorization and perform those actions.

Read aloud uses an English local device voice when supported. It sends no audio to OpenAI. Voice recording/transcription is not enabled in this release. No conversation is saved by this widget; Clear chat resets it and signing out clears the widget.

## Live AI later
The Responses API integration stays server-side. A key alone does not activate requests. Both OPENAI_API_KEY and PAUSTIK_LIVE_AI_ENABLED=true are required, and the account must have API credit. Guests always use guided help. OPENAI_MODEL is optional. Never expose these values in browser configuration, screenshots or source control. No production key was added by this release.

When enabled, conversation text is sent to OpenAI with store:false. Private account records are not attached. Provider failures fall back to guided help. Configure durable rate limiting before broad live AI rollout; the present limiter is per server process. Live voice input requires a separate authenticated transcription endpoint and device microphone tests before release.

## Validation
Four guide tests cover role links, subscription/cancellation rules, test wallet distinction and no fabricated account actions. Isolated browser checks cover mobile display, guided replies, guest/admin links and malformed request rejection. No paid API calls were made in these checks.
