package in.paustik.mobile;

import android.content.Context;
import java.io.*;
import java.text.SimpleDateFormat;
import java.util.*;
import org.json.*;

/** Clearly labelled on-device practice only. Never calls a payment or delivery API. */
final class PracticeStore {
  private final Context context;

  PracticeStore(Context c) {
    context = c;
  }

  JSONArray kitchens() throws Exception {
    try (InputStream input = context.getAssets().open("review-demo.json");
        ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      byte[] b = new byte[8192];
      int n;
      while ((n = input.read(b)) != -1) output.write(b, 0, n);
      JSONArray rows = new JSONArray(output.toString("UTF-8"));
      for (int i = 0; i < rows.length(); i++) {
        JSONArray meals = rows.getJSONObject(i).getJSONArray("meals");
        for (int j = 0; j < meals.length(); j++) {
          JSONObject m = meals.getJSONObject(j);
          m.put("serviceDate", date(1));
          m.put("deliveryTime", "12:30");
          m.put("servings", 20);
          m.put("menuId", "practice-" + i + "-" + j);
        }
      }
      return rows;
    }
  }

  static String date(int offset) {
    Calendar c = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
    c.add(Calendar.DATE, offset);
    SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
    f.setTimeZone(c.getTimeZone());
    return f.format(c.getTime());
  }

  JSONArray orders() {
    try {
      return new JSONArray(context.getSharedPreferences("practice", 0).getString("orders", "[]"));
    } catch (Exception ignored) {
      return new JSONArray();
    }
  }

  JSONObject order(JSONObject kitchen, JSONObject meal, int quantity, int days, String firstDate)
      throws Exception {
    JSONObject order =
        new JSONObject()
            .put("id", UUID.randomUUID().toString())
            .put("orderNumber", "PRACTICE-" + System.currentTimeMillis())
            .put("status", "ORDER_PLACED")
            .put("paymentStatus", "NO_PAYMENT")
            .put("kitchen", new JSONObject().put("name", kitchen.optString("name")))
            .put("items", new JSONArray().put(quantity + " × " + meal.optString("name")))
            .put("total", meal.optDouble("price") * quantity * days)
            .put("days", days)
            .put("scheduledFor", firstDate + "T12:30:00+05:30");
    JSONArray rows = orders();
    JSONArray bounded = new JSONArray().put(order);
    for (int i = 0; i < Math.min(rows.length(), 49); i++) bounded.put(rows.getJSONObject(i));
    save(bounded);
    return order;
  }

  void advance(String id, String status) throws Exception {
    JSONArray rows = orders();
    for (int i = 0; i < rows.length(); i++)
      if (rows.getJSONObject(i).optString("id").equals(id))
        rows.getJSONObject(i).put("status", status);
    save(rows);
  }

  private void save(JSONArray rows) {
    context.getSharedPreferences("practice", 0).edit().putString("orders", rows.toString()).apply();
  }
}
