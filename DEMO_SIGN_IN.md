# On-screen demo codes

Open `/demo-sign-in`, also linked from sign-in and create-account pages.

1. Choose Customer, Mother or Delivery agent.
2. Select **Show test code**.
3. Enter the displayed six digits within five minutes.
4. Select **Open demo workspace**.
5. Use **Leave demo / change role** to start another role.

These are browser-only sample profiles, not database accounts or identity verification. Five incorrect attempts clear the challenge. Changing roles, leaving the demo or refreshing clears the current demo. Codes are never sent by SMS, WhatsApp or email. They have no authority on any backend endpoint.

The selected sample workspace supports meal browsing and baskets, sample mother menu edits, or sample courier status changes. Sample activity is temporary and does not flow into live operations, balances, orders or messages. This is UI demonstration, not end-to-end marketplace UAT.

Real account authentication is unchanged. No production demo-auth setting is enabled. No existing phone account can be accessed with these codes. Administrators continue to use the protected admin sign-in and authenticator flow.
