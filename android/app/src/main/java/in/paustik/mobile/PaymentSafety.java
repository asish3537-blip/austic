package in.paustik.mobile;

import org.json.JSONObject;

/** Fail closed before opening the SDK; never put provider secrets in the app. */
final class PaymentSafety {
  static void requireTestCheckout(JSONObject data) throws Exception {
    if (!data.optString("key").matches("rzp_test_[A-Za-z0-9]+")
        || !data.optString("mode").equals("test")
        || !data.optString("currency").equals("INR")
        || data.optInt("amount") <= 0
        || !data.optString("providerOrderId").matches("order_[A-Za-z0-9]+")
        || data.optBoolean("localFixture"))
      throw new Exception("This checkout is not a verified Razorpay Test payment.");
  }

  static String refundMessage(JSONObject data) {
    if (data.optBoolean("refunded")) return "Test refund completed. No real money moved.";
    if (data.optBoolean("refundPending")) return data.optString("message", "Test refund pending. Check again shortly.");
    return "Unpaid practice order cancelled. No refund was needed.";
  }
}
