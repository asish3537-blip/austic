# Personal-account pilot testing

The setup page is `/pilot/start`. Testers create their own customer accounts or sign in, then open `/pilot`. Each account receives a private practice workspace. No shared credentials or partner-account privileges are supplied.

The separately labelled Android download is `Paustik-1.4.2-test6.apk`, package `in.paustik.mobile`, versionCode 12. Its QA build enables `TEST_PAYMENTS_ONLY`. Authentication and the owner-scoped pilot API remain available; real order/account writes and Live checkout are blocked by the native client. The stable public app download and PhonePe submission are unchanged.

Razorpay Test configuration stays server-side. The native app accepts only a Test key, positive INR amount and valid provider order before opening its SDK. Web and native clients use the existing private pilot order, confirmation, reconciliation and refund APIs. They do not send provider secrets to the device. No production payment rules changed.

Use the [provider's official Test-card guide](https://github.com/razorpay/markdown-docs/blob/master/payments/payments/test-card-details.md). The documented simulated Visa number is `4111 1111 1111 1111`, with a future expiry and arbitrary CVV. Do not enter real card/bank information or scan the Test QR with a real payment app. Decline saving the synthetic card.

After provider success, refresh the practice workspace or use **Check Test payment** if checkout return was interrupted. Paustik's server and signed Test webhook determine payment state. A paid Test cancellation requests a Test refund; **Test refund pending** is distinct from **Test refund completed**.

The timeline now explicitly calls out packing at **Packed · ready for courier**, with the existing packed-parcel photo and uploaded timestamp. Photo evidence does not advance the order status. Missing portion and allergen information remains explicitly unknown.
