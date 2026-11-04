package in.paustik.mobile;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.widget.*;
import org.json.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.*;
import java.util.concurrent.*;

public final class KitchenActivity extends Activity {
    private static final String SITE = "https://paustik.in";
    private static final int GREEN = Color.rgb(181, 44, 46);
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private LinearLayout body;
    private String city = "Bhubaneswar";
    private JSONArray kitchens = new JSONArray();
    private int selected = -1;
    private boolean sample;
    private int requestId;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) {
            city = state.getString("city", city);
            sample = state.getBoolean("sample");
            selected = state.getInt("selected", -1);
        }
        if (sample) preview(); else search();
    }

    @Override public void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        state.putString("city", city);
        state.putBoolean("sample", sample);
        state.putInt("selected", selected);
    }

    @Override public void onDestroy() {
        ++requestId;
        worker.shutdownNow();
        super.onDestroy();
    }

    private void search() {
        sample = false;
        int id = ++requestId;
        String place = city;
        kitchens = new JSONArray();
        directory("Finding published menus…");
        worker.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(SITE + "/api/mobile/kitchens?city=" + Uri.encode(place));
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(9000);
                connection.setReadTimeout(12000);
                connection.setInstanceFollowRedirects(false);
                if (connection.getResponseCode() != 200) throw new IOException("Directory unavailable");
                JSONArray rows = new JSONObject(read(connection.getInputStream())).getJSONArray("kitchens");
                runOnUiThread(() -> {
                    if (id != requestId || isFinishing()) return;
                    kitchens = rows;
                    if (selected >= 0 && selected < rows.length()) detail(selected);
                    else directory(rows.length() == 0 ? "No published menus in " + place + " yet." : "Published kitchens in " + place);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    if (id == requestId && !isFinishing()) directory("Couldn’t load kitchens. Check your connection, then tap Find kitchens to retry.");
                });
            } finally { if (connection != null) connection.disconnect(); }
        });
    }

    private static String read(InputStream input) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, "UTF-8"))) {
            StringBuilder result = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) result.append(line);
            return result.toString();
        }
    }

    private void preview() {
        ++requestId;
        sample = true;
        try {
            kitchens = new JSONArray(read(getAssets().open("sample.json")));
            if (selected >= 0 && selected < kitchens.length()) detail(selected);
            else directory("Sample menus · Bhubaneswar. Explore without placing an order.");
        } catch (Exception error) { directory("Sample menus could not be opened."); }
    }

    private int dp(int value) { return Math.round(getResources().getDisplayMetrics().density * value); }

    private void page() {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(255, 248, 237));
        scroll.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            }
            return insets;
        });
        body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(20), dp(24), dp(20), dp(24));
        scroll.addView(body);
        setContentView(scroll);
        text("PAUSSTIK   /   NEIGHBOURHOOD MEALS", 13, true);
    }

    private void text(String value, int size, boolean bold) {
        TextView label = new TextView(this);
        label.setText(value);
        label.setTextSize(size);
        label.setTextColor(bold ? GREEN : Color.rgb(62, 66, 60));
        if (bold) label.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        label.setPadding(0, dp(6), 0, dp(5));
        body.addView(label);
    }

    private void action(String title, Runnable press) {
        Button button = new Button(this);
        button.setText(title);
        button.setTextSize(16);
        button.setAllCaps(false);
        button.setTextColor(Color.WHITE);
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(GREEN);
        shape.setCornerRadius(dp(14));
        button.setBackground(shape);
        button.setPadding(dp(14), dp(10), dp(14), dp(10));
        button.setOnClickListener(view -> press.run());
        LinearLayout.LayoutParams layout = new LinearLayout.LayoutParams(-1, -2);
        layout.setMargins(0, dp(5), 0, dp(5));
        body.addView(button, layout);
    }

    private void directory(String message) {
        page();
        text("Find your kitchen", 30, true);
        text("Home-cooked meals in your city.", 16, false);
        EditText place = new EditText(this);
        place.setSingleLine();
        place.setHint("City");
        place.setContentDescription("City for kitchen search");
        place.setText(city);
        body.addView(place);
        action("Find kitchens", () -> {
            String value = place.getText().toString().trim();
            if (value.isEmpty() || value.length() > 80) { place.setError("Enter your city"); return; }
            selected = -1;
            city = value;
            search();
        });
        text(message, 16, true);
        for (int i = 0; i < kitchens.length(); i++) {
            final int position = i;
            JSONObject row = kitchens.optJSONObject(i);
            if (row != null) action(row.optString("name") + "  ·  " + row.optString("locality"), () -> detail(position));
        }
        if (!sample && kitchens.length() == 0 && !message.contains("Finding")) action("Preview a sample menu", () -> { selected = -1; preview(); });
        action("My workspace", () -> open("/app"));
        TextView website = new TextView(this);
        website.setText("Go to website ↗");
        website.setTextColor(GREEN);
        website.setGravity(android.view.Gravity.CENTER);
        website.setMinHeight(dp(48));
        website.setOnClickListener(view -> open("/"));
        body.addView(website);
    }

    private void detail(int index) {
        selected = index;
        JSONObject row = kitchens.optJSONObject(index);
        page();
        action("← Kitchens", this::backToList);
        text(row.optString("name"), 28, true);
        text(row.optString("locality") + " · " + row.optString("cuisine"), 16, false);
        text(sample ? "Sample menu" : "Available meals", 20, true);
        JSONArray meals = row.optJSONArray("meals");
        for (int i = 0; meals != null && i < meals.length(); i++) {
            JSONObject meal = meals.optJSONObject(i);
            text(meal.optString("name") + "   ₹" + meal.optInt("price"), 18, true);
            JSONArray items = meal.optJSONArray("components");
            StringBuilder line = new StringBuilder();
            for (int j = 0; items != null && j < items.length(); j++) {
                if (j > 0) line.append(" · ");
                line.append(items.optString(j));
            }
            text(line.toString(), 15, false);
            if (!sample) text(meal.optString("serviceDate") + " · " + meal.optString("deliveryTime"), 14, false);
        }
        if (sample) text("Preview only. Find a published kitchen to start a meal plan.", 15, false);
        else action("Choose a plan on Pausstik", () -> open("/customer/kitchens/" + Uri.encode(row.optString("id"))));
    }

    private void backToList() {
        selected = -1;
        directory(sample ? "Sample menus · Bhubaneswar" : "Published kitchens in " + city);
    }

    @Override public void onBackPressed() {
        if (selected >= 0) backToList(); else super.onBackPressed();
    }

    private void open(String path) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(SITE + path))); }
        catch (ActivityNotFoundException error) { Toast.makeText(this, "Install a browser to open Pausstik online.", Toast.LENGTH_LONG).show(); }
    }
}
