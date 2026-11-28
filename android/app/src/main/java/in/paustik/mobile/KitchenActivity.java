package in.paustik.mobile;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.location.*;
import android.net.Uri;
import android.os.*;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import com.razorpay.Checkout;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import java.io.*;
import java.text.*;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

/** All core screens are Android views. No website is embedded in the application. */
public final class KitchenActivity extends Activity implements PaymentResultWithDataListener {
  private static final int RED = 0xffb52c2e,
      GREEN = 0xff245a43,
      INK = 0xff402b2d,
      PAPER = 0xfffffaf0;
  private final ExecutorService worker = Executors.newSingleThreadExecutor();
  private NativeApi api;
  private PracticeStore practice;
  private JSONObject user, workspace;
  private LinearLayout body;
  private TextView notice;
  private boolean busy, practiceMode;
  private boolean paymentPilot, paymentInProgress;
  private String screen = "home", city = "Bhubaneswar", language = "en", paymentOrder = "";
  private JSONObject translations = new JSONObject();
  private final Map<String, Typeface> fonts = new HashMap<>();
  private EditText latitudeInput, longitudeInput;
  private LocationListener gpsListener;
  private JSONObject selectedKitchen, selectedMeal;
  private String photoOrder, photoStage;

  interface Task {
    JSONObject run() throws Exception;
  }

  interface Done {
    void run(JSONObject data) throws Exception;
  }

  @Override
  public void onCreate(Bundle saved) {
    super.onCreate(saved);
    api = new NativeApi(this);
    practice = new PracticeStore(this);
    language = getPreferences(0).getString("language", "en");
    paymentOrder = getPreferences(0).getString("pendingPaymentOrder", "");
    paymentPilot = getPreferences(0).getBoolean("pendingPaymentPilot", false);
    try {
      translations = new JSONObject(assetText("native-translations.json"));
    } catch (Exception ignored) {
    }
    if (saved != null) {
      practiceMode = saved.getBoolean("practice");
      paymentOrder = saved.getString("paymentOrder", "");
      paymentPilot = saved.getBoolean("paymentPilot", paymentPilot);
      photoOrder = saved.getString("photoOrder");
      photoStage = saved.getString("photoStage");
    }
    if (Build.VERSION.SDK_INT >= 33)
      getOnBackInvokedDispatcher()
          .registerOnBackInvokedCallback(
              android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> back());
    if (api.signedIn()) {
      page("Welcome back");
      request(
          () -> api.get("/api/auth/session"),
          d -> {
            user = d.getJSONObject("user");
            home();
          },
          () -> {
            api.clear();
            user = null;
            home();
          });
    } else home();
  }

  @Override
  public void onSaveInstanceState(Bundle out) {
    out.putBoolean("practice", practiceMode);
    out.putString("paymentOrder", paymentOrder);
    out.putBoolean("paymentPilot", paymentPilot);
    out.putString("photoOrder", photoOrder);
    out.putString("photoStage", photoStage);
    super.onSaveInstanceState(out);
  }

  @Override
  public void onDestroy() {
    stopGps();
    worker.shutdownNow();
    super.onDestroy();
  }

  @Override
  public void onBackPressed() {
    back();
  }

  private void back() {
    if (paymentInProgress) return;
    if (!screen.equals("home")) home();
    else finish();
  }

  private Typeface font(boolean bold) {
    Typeface face = fonts.get(language);
    if (face == null) {
      String name =
          language.equals("or")
              ? "notosansoriya"
              : language.equals("hi") ? "notosansdevanagari" : "manrope";
      try {
        face = Typeface.createFromAsset(getAssets(), "fonts/" + name + ".ttf");
      } catch (Exception e) {
        face = Typeface.DEFAULT;
      }
      fonts.put(language, face);
    }
    return Typeface.create(face, bold ? Typeface.BOLD : Typeface.NORMAL);
  }

  private int dp(int n) {
    return Math.round(getResources().getDisplayMetrics().density * n);
  }

  private String t(String key) {
    JSONObject row = translations.optJSONObject(language);
    return row == null ? key : row.optString(key, key);
  }

  private static JSONObject j(Object... values) {
    JSONObject d = new JSONObject();
    try {
      for (int i = 0; i < values.length; i += 2)
        d.put(String.valueOf(values[i]), values[i + 1] == null ? JSONObject.NULL : values[i + 1]);
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid app data");
    }
    return d;
  }

  private static String join(JSONArray values) {
    if (values == null) return "";
    StringBuilder s = new StringBuilder();
    for (int i = 0; i < values.length(); i++) {
      if (i > 0) s.append(", ");
      s.append(values.optString(i));
    }
    return s.toString();
  }

  private String money(double n) {
    return "₹" + String.format(Locale.US, "%.2f", n);
  }

  private String role() {
    return user == null ? "GUEST" : user.optString("role");
  }

  private String assetText(String name) throws Exception {
    try (InputStream in = getAssets().open(name);
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] b = new byte[8192];
      int n;
      while ((n = in.read(b)) != -1) out.write(b, 0, n);
      return out.toString("UTF-8");
    }
  }

  private GradientDrawable shape(int fill) {
    GradientDrawable d = new GradientDrawable();
    d.setColor(fill);
    d.setCornerRadius(dp(9));
    return d;
  }

  private void page(String title) {
    stopGps();
    screen = title.equals("Home") ? "home" : title;
    LinearLayout root = new LinearLayout(this);
    root.setOrientation(1);
    root.setBackgroundColor(PAPER);
    root.setOnApplyWindowInsetsListener(
        (v, i) -> {
          if (Build.VERSION.SDK_INT >= 30) {
            Insets b =
                i.getInsets(
                    WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout()
                        | WindowInsets.Type.ime());
            v.setPadding(b.left, b.top, b.right, b.bottom);
          }
          return i;
        });
    LinearLayout header = new LinearLayout(this);
    header.setGravity(Gravity.CENTER_VERTICAL);
    header.setPadding(dp(18), dp(8), dp(18), dp(8));
    ImageView logo = new ImageView(this);
    try {
      logo.setImageBitmap(BitmapFactory.decodeStream(getAssets().open("paustik-logo.png")));
    } catch (Exception ignored) {
    }
    logo.setContentDescription("Paustik");
    logo.setScaleType(ImageView.ScaleType.FIT_START);
    header.addView(logo, new LinearLayout.LayoutParams(0, dp(48), 1));
    Button lang = new Button(this);
    lang.setText(language.equals("or") ? "ଓଡ଼ିଆ" : language.equals("hi") ? "हिन्दी" : "English");
    lang.setAllCaps(false);
    lang.setOnClickListener(
        v ->
            new AlertDialog.Builder(this)
                .setTitle("Language / ଭାଷା")
                .setItems(
                    new String[] {"English", "हिन्दी", "ଓଡ଼ିଆ"},
                    (a, w) -> {
                      language = new String[] {"en", "hi", "or"}[w];
                      getPreferences(0).edit().putString("language", language).apply();
                      home();
                    })
                .show());
    header.addView(lang);
    root.addView(header);
    ScrollView scroll = new ScrollView(this);
    scroll.setFillViewport(true);
    body = new LinearLayout(this);
    body.setOrientation(1);
    body.setPadding(dp(18), dp(12), dp(18), dp(24));
    scroll.addView(body);
    root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
    if (BuildConfig.DEBUG) label("Local test build. No physical delivery.", 12, true);
    if (BuildConfig.TEST_PAYMENTS_ONLY) label("TEST BUILD · No live payments or real orders", 13, true);
    if (practiceMode) label("ON-DEVICE PRACTICE · No payment or food delivery", 13, true);
    if (!title.equals("Home")) label(title, 27, true);
    notice = label("", 14, false);
    notice.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
    LinearLayout nav = new LinearLayout(this);
    nav.setPadding(dp(6), dp(6), dp(6), dp(6));
    nav.setBackgroundColor(0xffedf2e8);
    navButton(nav, "Home", () -> home());
    navButton(nav, "Orders", () -> orders());
    navButton(nav, "Food shop", () -> products());
    navButton(nav, "Account", () -> account());
    root.addView(nav);
    setContentView(root);
  }

  private void navButton(LinearLayout nav, String title, Runnable action) {
    Button b = new Button(this);
    b.setText(t(title));
    b.setTag("nav:" + title);
    b.setTextColor(GREEN);
    b.setTextSize(12);
    b.setTypeface(font(true));
    String iconName =
        title.equals("Home")
            ? "home"
            : title.equals("Orders") ? "orders" : title.equals("Food shop") ? "shop" : "account";
    int iconId = getResources().getIdentifier("nav_" + iconName, "drawable", getPackageName());
    if (iconId != 0) {
      b.setCompoundDrawablesWithIntrinsicBounds(null, getDrawable(iconId), null, null);
      b.setCompoundDrawablePadding(dp(3));
    }
    b.setAllCaps(false);
    b.setMinHeight(dp(64));
    b.setOnClickListener(
        v -> {
          if (!busy && !paymentInProgress) action.run();
        });
    nav.addView(b, new LinearLayout.LayoutParams(0, -2, 1));
  }

  private TextView label(String text, int size, boolean bold) {
    TextView v = new TextView(this);
    v.setText(t(text));
    v.setTextColor(bold ? GREEN : INK);
    v.setTextSize(size);
    v.setPadding(0, dp(6), 0, dp(6));
    v.setTypeface(font(bold));
    body.addView(v);
    return v;
  }

  private void button(String text, Runnable press) {
    Button b = new Button(this);
    b.setText(t(text));
    b.setTag("action:" + text);
    b.setTextSize(15);
    b.setTypeface(font(true));
    b.setTextColor(-1);
    b.setAllCaps(false);
    b.setMinHeight(dp(48));
    b.setBackground(shape(RED));
    LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
    p.setMargins(0, dp(7), 0, dp(7));
    body.addView(b, p);
    b.setOnClickListener(
        v -> {
          if (!busy && !paymentInProgress) press.run();
        });
  }

  private EditText field(String text, String value, int input) {
    label(text, 13, true);
    EditText e = new EditText(this);
    e.setTextSize(16);
    e.setTypeface(font(false));
    e.setTag("field:" + text);
    e.setText(value);
    if (text.equals("Email address")) e.setHint("name@example.com");
    e.setInputType(input);
    e.setSingleLine(input != InputType.TYPE_CLASS_TEXT);
    e.setMinHeight(dp(48));
    e.setPadding(dp(12), dp(8), dp(12), dp(8));
    e.setBackground(shape(-1));
    e.setContentDescription(t(text));
    body.addView(e, new LinearLayout.LayoutParams(-1, -2));
    return e;
  }

  private Spinner choice(String title, String[] values) {
    label(title, 13, true);
    Spinner s = new Spinner(this);
    s.setTag("choice:" + title);
    ArrayAdapter<String> a =
        new ArrayAdapter<>(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            Arrays.stream(values).map(this::t).toArray(String[]::new));
    s.setAdapter(a);
    s.setMinimumHeight(dp(48));
    body.addView(s);
    return s;
  }

  private void divider() {
    View line = new View(this);
    line.setBackgroundColor(0xffdfd9ca);
    LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, dp(1));
    p.setMargins(0, dp(14), 0, dp(12));
    body.addView(line, p);
  }

  private void info(String s) {
    if (notice != null) notice.setText(t(s));
  }

  private void error(Exception e) {
    info(e.getMessage() == null ? "Please retry." : e.getMessage());
  }

  private void request(Task task, Done done) {
    request(task, done, null);
  }

  private void request(Task task, Done done, Runnable failure) {
    if (busy) return;
    busy = true;
    info("Loading…");
    worker.execute(
        () -> {
          try {
            JSONObject r = task.run();
            runOnUiThread(
                () -> {
                  if (isFinishing() || isDestroyed()) return;
                  busy = false;
                  info("");
                  try {
                    done.run(r);
                  } catch (Exception e) {
                    error(e);
                  }
                });
          } catch (Exception e) {
            runOnUiThread(
                () -> {
                  if (isFinishing() || isDestroyed()) return;
                  busy = false;
                  if (failure != null) failure.run();
                  else error(e);
                });
          }
        });
  }

  private void home() {
    if (busy) return;
    if (!practiceMode && role().equals("MOTHER")) {
      mother();
      return;
    }
    if (!practiceMode && role().equals("DELIVERY_AGENT")) {
      courier();
      return;
    }
    page("Home");
    label("A little home. In every meal.", 29, true);
    label("Find Mother Kitchens, choose your meals and follow your order.", 16, false);
    button(
        practiceMode ? "Browse live kitchens" : "Try a practice order",
        () -> {
          practiceMode = !practiceMode;
          home();
        });
    if (!practiceMode && user == null) {
      button("Sign in", () -> signIn());
      button("Create your account", () -> register());
    }
    if (practiceMode) {
      try {
        showPracticeKitchens(false);
      } catch (Exception e) {
        error(e);
      }
      return;
    }
    if (user != null) {
      button("Test payments & refunds", () -> pilotHome());
      request(
          () -> api.get("/api/mobile/workspace"),
          d -> {
            workspace = d;
            label(d.optString("deliveryArea"), 14, false);
            button("Delivery address", () -> address());
            showKitchens(d.optJSONArray("kitchens"));
          });
    } else {
      EditText location = field("City", city, InputType.TYPE_CLASS_TEXT);
      button(
          "Find kitchens",
          () -> {
            city = location.getText().toString().trim();
            if (city.isEmpty()) {
              location.setError(t("Enter your city"));
              return;
            }
            request(
                () -> api.get("/api/mobile/kitchens?city=" + Uri.encode(city)),
                d -> showKitchens(d.optJSONArray("kitchens")));
          });
      label("Choose a city to browse live kitchens, or try a practice order offline.", 15, false);
    }
  }

  private void showKitchens(JSONArray rows) {
    if (rows == null || rows.length() == 0) {
      label(
          "No published meals here yet. Try the practice order or check another city.", 16, false);
      return;
    }
    for (int i = 0; i < rows.length(); i++) {
      JSONObject k = rows.optJSONObject(i);
      if (k == null) continue;
      divider();
      label(k.optString("name"), 21, true);
      label(
          k.optString("locality", k.optString("area")) + " · " + k.optString("cuisine", city),
          14,
          false);
      JSONArray meals = k.optJSONArray("meals");
      if (practiceMode && meals != null && meals.length() > 0) foodImage(meals.optJSONObject(0));
      label((meals == null ? 0 : meals.length()) + " " + t("available meals"), 13, false);
      button("View menu", () -> menu(k));
    }
  }

  private void showPracticeKitchens(boolean all) throws Exception {
    JSONArray kitchens = practice.kitchens(), visible = new JSONArray();
    for (int i = 0; i < Math.min(all ? kitchens.length() : 5, kitchens.length()); i++)
      visible.put(kitchens.get(i));
    showKitchens(visible);
    if (!all && kitchens.length() > 5)
      button(
          "See all practice kitchens",
          () -> {
            page("Practice kitchens");
            try {
              showPracticeKitchens(true);
            } catch (Exception e) {
              error(e);
            }
          });
  }

  private void foodImage(JSONObject meal) {
    String tier = meal.optString("tier", "BASE").toLowerCase(Locale.US);
    String name =
        tier.equals("cheese") ? "paneer" : tier.equals("desi_chicken") ? "desi-chicken" : tier;
    try {
      InputStream in = getAssets().open("food/" + name + ".jpg");
      ImageView view = new ImageView(this);
      view.setImageBitmap(BitmapFactory.decodeStream(in));
      in.close();
      view.setScaleType(ImageView.ScaleType.CENTER_CROP);
      view.setContentDescription(meal.optString("name"));
      body.addView(view, new LinearLayout.LayoutParams(-1, dp(155)));
    } catch (Exception ignored) {
    }
  }

  private void menu(JSONObject k) {
    page("Menu");
    label(k.optString("name"), 26, true);
    label(k.optString("cuisine"), 15, false);
    JSONArray meals = k.optJSONArray("meals");
    for (int i = 0; meals != null && i < meals.length(); i++) {
      JSONObject m = meals.optJSONObject(i);
      if (m == null) continue;
      divider();
      if (practiceMode) foodImage(m);
      label(m.optString("name"), 21, true);
      label(money(m.optDouble("price")), 20, true);
      label(
          m.optString(
              "description",
              m.optJSONArray("components") == null ? "" : join(m.optJSONArray("components"))),
          15,
          false);
      label(
          m.optString("serviceDate")
              + " · "
              + m.optString("deliveryTime")
              + " · "
              + m.optInt("servings")
              + " "
              + t("servings"),
          13,
          false);
      button("Choose this meal", () -> meal(k, m));
    }
  }

  private void meal(JSONObject k, JSONObject m) {
    selectedKitchen = k;
    selectedMeal = m;
    page("Choose your meal");
    label(m.optString("name"), 24, true);
    if (!practiceMode && user == null) {
      label("Sign in to order from a real kitchen.", 16, false);
      button("Sign in", () -> signIn());
      return;
    }
    Spinner quantity = choice("Servings", new String[] {"1", "2", "3", "4", "5", "6", "7", "8"});
    Spinner days =
        choice(
            "Meal days",
            m.optBoolean("oneTimeOnly")
                ? new String[] {"1"}
                : new String[] {"1", "3", "4", "5", "6", "7"});
    label(t("First serving date") + ": " + m.optString("serviceDate"), 15, false);
    label(
        "A one-day meal needs no subscription. Meal plans use the kitchen's available dates.",
        14,
        false);
    button(
        "Review order",
        () -> {
          int q = Integer.parseInt(quantity.getSelectedItem().toString()),
              n = Integer.parseInt(days.getSelectedItem().toString());
          if (practiceMode) {
            new AlertDialog.Builder(this)
                .setTitle(t("Practice order"))
                .setMessage(
                    m.optString("name")
                        + "\n"
                        + q
                        + " × "
                        + n
                        + " "
                        + t("days")
                        + "\n"
                        + t("Illustrative total")
                        + ": "
                        + money(m.optDouble("price") * q * n)
                        + "\n\n"
                        + t("No payment or food delivery. Saved on this device only."))
                .setNegativeButton(t("Cancel"), null)
                .setPositiveButton(
                    t("Place practice order"),
                    (dialog, w) -> {
                      try {
                        practice.order(k, m, q, n, m.optString("serviceDate"));
                        orders();
                      } catch (Exception e) {
                        error(e);
                      }
                    })
                .show();
            return;
          }
          JSONArray ids = new JSONArray();
          if (n == 1) ids.put(m.optString("menuId"));
          else {
            JSONArray candidates = k.optJSONArray("meals");
            Set<String> chosenDays = new HashSet<>();
            for (int i = 0;
                candidates != null && i < candidates.length() && ids.length() < n;
                i++) {
              JSONObject a = candidates.optJSONObject(i);
              if (a != null
                  && !a.optBoolean("oneTimeOnly")
                  && a.optString("name").equals(m.optString("name"))
                  && a.optString("mealPeriod").equals(m.optString("mealPeriod"))
                  && !chosenDays.contains(a.optString("serviceDate"))
                  && a.optString("serviceDate").compareTo(m.optString("serviceDate")) >= 0) {
                ids.put(a.optString("menuId"));
                chosenDays.add(a.optString("serviceDate"));
              }
            }
            if (ids.length() != n) {
              info("This kitchen has too few published days for that plan.");
              return;
            }
          }
          request(
              () -> api.post("/api/checkout/quote", j("menuIds", ids, "quantity", q)),
              quote -> confirmMeal(ids, q, quote));
        });
  }

  private void confirmMeal(JSONArray ids, int quantity, JSONObject quote) {
    page("Checkout");
    label(selectedMeal.optString("name"), 23, true);
    label(t("Food") + ": " + money(quote.optDouble("subtotal")), 17, false);
    label(t("Delivery") + ": " + money(quote.optDouble("deliveryFee")), 17, false);
    label(t("Discount") + ": " + money(quote.optDouble("discount")), 17, false);
    label(t("Total") + ": " + money(quote.optDouble("total")), 22, true);
    label(t("Wallet applied") + ": " + money(quote.optDouble("walletApplied")), 15, false);
    label(t("Balance due") + ": " + money(quote.optDouble("amountDue")), 19, true);
    button(
        "Place order",
        () ->
            request(
                () ->
                    ids.length() == 1
                        ? api.post(
                            "/api/marketplace/orders",
                            j(
                                "menuId",
                                ids.getString(0),
                                "quantity",
                                quantity,
                                "quoteId",
                                quote.getString("quoteId")))
                        : api.post(
                            "/api/customer/subscriptions",
                            j(
                                "menuIds",
                                ids,
                                "quantity",
                                quantity,
                                "quoteId",
                                quote.getString("quoteId"))),
                d -> {
                  String id = d.optString("orderId");
                  if (id.isEmpty() && d.optJSONArray("orders") != null)
                    id = d.getJSONArray("orders").getJSONObject(0).getString("id");
                  final String payable = id;
                  page("Order placed");
                  label(d.optString("message"), 16, false);
                  if (ids.length() > 1)
                    label(
                        "Your plan has one order per meal day. Complete any payments from Orders.",
                        15,
                        false);
                  button("View orders", () -> orders());
                  if (ids.length() == 1 && d.optDouble("amountDue") > 0 && !payable.isEmpty())
                    button("Pay securely", () -> pay(payable));
                }));
  }

  private void signIn() {
    page("Sign in");
    button("Email me a sign-in code", () -> emailCodeSignIn());
    LinearLayout signInBody = body;
    worker.execute(() -> {
      try {
        JSONObject options = api.get("/api/auth/options");
        runOnUiThread(() -> { if (body == signInBody && options.optBoolean("google")) button("Continue with Google", () -> googleSignIn()); });
      } catch (Exception ignored) { /* Email and password remain available offline. */ }
    });
    EditText email =
        field(
            "Email address",
            "",
            InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
    EditText password =
        field("Password", "", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
    button(
        "Sign in",
        () ->
            request(
                () ->
                    api.post(
                        "/api/auth/login-password",
                        j(
                            "email",
                            email.getText().toString().trim(),
                            "password",
                            password.getText().toString())),
                d -> {
                  password.setText("");
                  practiceMode = false;
                  request(
                      () -> api.get("/api/auth/session"),
                      s -> {
                        user = s.getJSONObject("user");
                        home();
                      });
                }));
    button("Create your account", () -> register());
    button("Forgot password?", () -> emailAction("Reset password", "/api/auth/forgot-password"));
    button(
        "Resend confirmation email",
        () -> emailAction("Resend confirmation email", "/api/auth/resend-verification"));
  }

  private void signedInHome() {
    practiceMode = false;
    request(() -> api.get("/api/auth/session"), s -> { user = s.getJSONObject("user"); home(); });
  }

  private void emailCodeSignIn() {
    page("Email sign-in code");
    info("Enter your existing Paustik account email. We will send a six-digit code, valid for ten minutes.");
    EditText email = field("Email address", "", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
    button("Email me a code", () -> request(() -> api.post("/api/auth/email-code/request", j("email", email.getText().toString().trim())), d -> {
      String requestedEmail = email.getText().toString().trim();
      page("Check your email");
      info(d.optString("message", "Check your email for a sign-in code."));
      EditText code = field("Six-digit email code", "", InputType.TYPE_CLASS_NUMBER);
      code.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(6)});
      button("Sign in with code", () -> request(() -> api.post("/api/auth/email-code/verify", j("email", requestedEmail, "code", code.getText().toString().trim())), result -> { code.setText(""); signedInHome(); }));
      button("Change email or request a new code", () -> emailCodeSignIn());
    }));
    button("Use email and password", () -> signIn());
  }

  private void googleSignIn() {
    request(() -> api.post("/api/auth/google/challenge", j()), challenge -> {
      com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption option =
          new com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption.Builder(challenge.getString("clientId")).setNonce(challenge.getString("nonce")).build();
      androidx.credentials.GetCredentialRequest credentials = new androidx.credentials.GetCredentialRequest.Builder().addCredentialOption(option).build();
      androidx.credentials.CredentialManager.create(this).getCredentialAsync(this, credentials, new CancellationSignal(), command -> runOnUiThread(command),
          new androidx.credentials.CredentialManagerCallback<androidx.credentials.GetCredentialResponse, androidx.credentials.exceptions.GetCredentialException>() {
            @Override public void onResult(androidx.credentials.GetCredentialResponse result) {
              try {
                androidx.credentials.Credential credential = result.getCredential();
                if (!(credential instanceof androidx.credentials.CustomCredential) || !credential.getType().equals(com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL)) { info("Google sign-in could not be verified. Use email instead."); return; }
                String token = com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                request(() -> api.post("/api/auth/google/token", j("credential", token)), d -> signedInHome());
              } catch (Exception error) { info("Google sign-in could not be completed. Use email instead."); }
            }
            @Override public void onError(androidx.credentials.exceptions.GetCredentialException error) { info("Google sign-in was cancelled or unavailable. Try email instead."); }
          });
    });
  }

  private void emailAction(String title, String endpoint) {
    page(title);
    EditText email =
        field(
            "Email address",
            "",
            InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
    button(
        "Send email",
        () ->
            request(
                () -> api.post(endpoint, j("email", email.getText().toString().trim())),
                d -> info(d.optString("message", "Check your email."))));
  }

  private void register() {
    page("Create your account");
    EditText name = field("Your name", "", InputType.TYPE_CLASS_TEXT),
        email =
            field(
                "Email address",
                "",
                InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS),
        phone = field("Phone number", "", InputType.TYPE_CLASS_PHONE),
        password =
            field(
                "Password", "", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD),
        street = field("Delivery address", "", InputType.TYPE_CLASS_TEXT),
        locality = field("Locality", "", InputType.TYPE_CLASS_TEXT),
        town = field("City", city, InputType.TYPE_CLASS_TEXT),
        pin = field("PIN code", "", InputType.TYPE_CLASS_NUMBER);
    label("Use 8–72 characters, with uppercase, lowercase and a number.", 13, false);
    button(
        "Create customer account",
        () ->
            request(
                () ->
                    api.post(
                        "/api/auth/register",
                        j(
                            "role",
                            "CUSTOMER",
                            "name",
                            name.getText().toString(),
                            "email",
                            email.getText().toString().trim(),
                            "phone",
                            phone.getText().toString(),
                            "password",
                            password.getText().toString(),
                            "addressLine1",
                            street.getText().toString(),
                            "locality",
                            locality.getText().toString(),
                            "city",
                            town.getText().toString(),
                            "pinCode",
                            pin.getText().toString())),
                d -> {
                  password.setText("");
                  page("Check your email");
                  label(d.optString("message"), 17, false);
                  button("Sign in", () -> signIn());
                }));
    button("Privacy & support", () -> help());
  }

  private void account() {
    page("Account");
    if (user == null) {
      button("Sign in", () -> signIn());
      button("Create your account", () -> register());
    } else {
      label(user.optString("name"), 24, true);
      label(user.optString("email"), 15, false);
      label(role(), 14, false);
      if (role().equals("CUSTOMER")) button("Delivery address", () -> address());
      button(
          "Sign out",
          () ->
              request(
                  () -> api.post("/api/auth/logout", j()),
                  d -> {
                    api.clear();
                    clearPilotAttempt();paymentOrder="";paymentPilot=false;savePaymentContext();
                    user = null;
                    workspace = null;
                    practiceMode = false;
                    home();
                  }));
    }
    button(
        practiceMode ? "Browse live kitchens" : "Try a practice order",
        () -> {
          practiceMode = !practiceMode;
          home();
        });
    button("Privacy & support", () -> help());
  }

  private void address() {
    request(
        () -> api.get("/api/mobile/workspace"),
        d -> {
          workspace = d;
          JSONObject a = d.optJSONObject("address");
          if (a == null) a = new JSONObject();
          page("Delivery address");
          EditText
              name =
                  field(
                      "Your name",
                      a.optString("recipientName", user.optString("name")),
                      InputType.TYPE_CLASS_TEXT),
              phone = field("Phone number", a.optString("phone"), InputType.TYPE_CLASS_PHONE),
              street =
                  field(
                      "Street and building",
                      a.optString("addressLine1"),
                      InputType.TYPE_CLASS_TEXT),
              locality = field("Locality", a.optString("locality"), InputType.TYPE_CLASS_TEXT),
              town = field("City", a.optString("city", city), InputType.TYPE_CLASS_TEXT),
              pin = field("PIN code", a.optString("pinCode"), InputType.TYPE_CLASS_NUMBER);
          latitudeInput =
              field(
                  "Latitude",
                  a.isNull("latitude") ? "" : a.optString("latitude"),
                  InputType.TYPE_CLASS_NUMBER
                      | InputType.TYPE_NUMBER_FLAG_DECIMAL
                      | InputType.TYPE_NUMBER_FLAG_SIGNED);
          longitudeInput =
              field(
                  "Longitude",
                  a.isNull("longitude") ? "" : a.optString("longitude"),
                  InputType.TYPE_CLASS_NUMBER
                      | InputType.TYPE_NUMBER_FLAG_DECIMAL
                      | InputType.TYPE_NUMBER_FLAG_SIGNED);
          label(
              "Location is optional for browsing. Save a delivery pin before ordering. Pickup and"
                  + " delivery use handover codes.",
              14,
              false);
          button("Use current location", () -> gps());
          button(
              "Save address",
              () -> {
                try {
                  String lat = latitudeInput.getText().toString(),
                      lon = longitudeInput.getText().toString();
                  JSONObject value =
                      j(
                          "name",
                          name.getText().toString(),
                          "phone",
                          phone.getText().toString(),
                          "addressLine1",
                          street.getText().toString(),
                          "locality",
                          locality.getText().toString(),
                          "city",
                          town.getText().toString(),
                          "pinCode",
                          pin.getText().toString(),
                          "latitude",
                          lat.isEmpty() ? null : Double.valueOf(lat),
                          "longitude",
                          lon.isEmpty() ? null : Double.valueOf(lon));
                  request(() -> api.post("/api/mobile/workspace", value), r -> home());
                } catch (Exception e) {
                  info("Enter valid delivery coordinates or leave both empty.");
                }
              });
        });
  }

  private void gps() {
    if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(
          new String[] {
            Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION
          },
          41);
      return;
    }
    try {
      LocationManager manager = (LocationManager) getSystemService(LOCATION_SERVICE);
      stopGps();
      gpsListener =
          new LocationListener() {
            public void onLocationChanged(Location l) {
              if (latitudeInput != null && longitudeInput != null) {
                latitudeInput.setText(String.valueOf(l.getLatitude()));
                longitudeInput.setText(String.valueOf(l.getLongitude()));
                info("Location added. Review and save your address.");
              }
              stopGps();
            }

            public void onStatusChanged(String p, int s, Bundle b) {}

            public void onProviderEnabled(String p) {}

            public void onProviderDisabled(String p) {}
          };
      String provider =
          manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
              ? LocationManager.GPS_PROVIDER
              : LocationManager.NETWORK_PROVIDER;
      manager.requestSingleUpdate(provider, gpsListener, getMainLooper());
      info("Waiting for location…");
    } catch (Exception e) {
      info("Location unavailable. You can enter a delivery pin manually.");
    }
  }

  private void stopGps() {
    if (gpsListener != null) {
      try {
        ((LocationManager) getSystemService(LOCATION_SERVICE)).removeUpdates(gpsListener);
      } catch (Exception ignored) {
      }
      gpsListener = null;
    }
  }

  @Override
  public void onRequestPermissionsResult(int request, String[] permissions, int[] results) {
    super.onRequestPermissionsResult(request, permissions, results);
    if (request == 41) {
      if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) gps();
      else info("Location permission was declined. Browsing remains available.");
    }
  }

  private void orders() {
    if (BuildConfig.TEST_PAYMENTS_ONLY && !practiceMode) { pilotHome(); return; }
    if (practiceMode) {
      showOrders(practice.orders());
      return;
    }
    if (user == null) {
      signIn();
      return;
    }
    if (!role().equals("CUSTOMER")) {
      home();
      return;
    }
    page("Orders");
    request(
        () -> api.get("/api/mobile/workspace"),
        d -> {
          workspace = d;
          showOrders(d.optJSONArray("orders"));
        });
  }

  private void showOrders(JSONArray rows) {
    page("Orders");
    button("Refresh orders", () -> orders());
    if (rows == null || rows.length() == 0) {
      label("No orders yet. Choose a meal to get started.", 17, false);
      button("Find kitchens", () -> home());
      return;
    }
    for (int i = 0; i < rows.length(); i++) {
      JSONObject o = rows.optJSONObject(i);
      if (o == null) continue;
      divider();
      label(o.optString("orderNumber"), 18, true);
      label(
          o.optJSONObject("kitchen") == null ? "" : o.optJSONObject("kitchen").optString("name"),
          16,
          false);
      label(o.optJSONArray("items") == null ? "" : join(o.optJSONArray("items")), 15, false);
      label(o.optString("status").replace('_', ' '), 16, true);
      label(money(o.optDouble("total")), 18, true);
      button("Track order", () -> track(o));
      if (!practiceMode
          && o.optString("paymentStatus").equals("PENDING")
          && !terminal(o.optString("status"))) {
        button("Pay securely", () -> pay(o.optString("id")));
        button(
            "Already paid? Check status",
            () ->
                request(
                    () ->
                        api.post(
                            "/api/customer/razorpay",
                            j("action", "reconcile", "orderId", o.optString("id"))),
                    d -> orders()));
      }
      if (!practiceMode
          && (o.optString("status").equals("ORDER_PLACED")
              || o.optString("status").equals("CONFIRMED")))
        button(
            "Cancel order",
            () ->
                new AlertDialog.Builder(this)
                    .setMessage(
                        t(
                            "Review the cancellation policy before confirming. Eligible refunds"
                                + " follow the order rules."))
                    .setNegativeButton(t("Keep order"), null)
                    .setPositiveButton(
                        t("Cancel order"),
                        (a, w) ->
                            request(
                                () ->
                                    api.post(
                                        "/api/customer/orders/" + o.optString("id") + "/cancel",
                                        j()),
                                d -> orders()))
                    .show());
    }
  }

  private static boolean terminal(String status) {
    return status.equals("DELIVERED") || status.equals("CANCELLED") || status.equals("FAILED");
  }

  private void track(JSONObject o) {
    page("Track order");
    if (practiceMode) {
      label(o.optString("orderNumber"), 17, true);
      label(o.optString("status").replace('_', ' '), 23, true);
      label("Practice simulation. No courier is dispatched.", 15, false);
      String[] stages = {
        "ORDER_PLACED",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "PICKED_UP",
        "OUT_FOR_DELIVERY",
        "DELIVERED"
      };
      int n = Arrays.asList(stages).indexOf(o.optString("status"));
      if (n >= 0 && n < stages.length - 1) {
        String next = stages[n + 1];
        button(
            "Simulate next stage",
            () -> {
              try {
                practice.advance(o.optString("id"), next);
                o.put("status", next);
                track(o);
              } catch (Exception e) {
                error(e);
              }
            });
      }
      return;
    }
    request(
        () -> api.get("/api/marketplace/tracking?orderId=" + Uri.encode(o.optString("id"))),
        d -> {
          label(d.optString("orderNumber"), 20, true);
          label(d.optString("orderStatus").replace('_', ' '), 24, true);
          if (!d.isNull("handoverCode")) {
            label("Delivery handover code", 16, true);
            label(d.optString("handoverCode"), 32, true);
            label("Share this code only when your meal arrives.", 14, false);
          }
          JSONArray events = d.optJSONArray("events");
          for (int i = 0; events != null && i < events.length(); i++) {
            JSONObject e = events.optJSONObject(i);
            label(e.optString("status").replace('_', ' ') + " · " + e.optString("at"), 14, false);
          }
          button("Refresh tracking", () -> track(o));
        });
  }

  private void savePaymentContext() {
    getPreferences(0).edit().putString("pendingPaymentOrder", paymentOrder)
        .putBoolean("pendingPaymentPilot", paymentPilot).commit();
  }

  private void clearPilotAttempt() {
    getPreferences(0).edit().remove("pilotSelection").remove("pilotRequestKey").apply();
  }

  private void pilotHome() {
    if (user == null) { signIn(); return; }
    page("Test payments & refunds");
    label("Fictional kitchens · Razorpay Test only · No real money or food delivery", 16, true);
    button("Refresh Test orders", () -> pilotHome());
    request(() -> api.get("/api/pilot?role=customer"), d -> {
      label("Your private practice orders. Live orders and wallet stay separate.", 15, false);
      JSONArray orders = d.optJSONArray("orders");
      for (int i=0; orders!=null && i<orders.length(); i++) {
        final JSONObject o=orders.getJSONObject(i), snapshot=o.optJSONObject("snapshot");
        final String id=o.getString("id"), status=o.optString("status"), payment=o.optString("paymentStatus");
        divider();
        label(String.format(Locale.ROOT,"TEST-%s",id.substring(0,Math.min(8,id.length())).toUpperCase(Locale.ROOT)), 17, true);
        label(snapshot==null?"":snapshot.optString("mealName"), 19, true);
        label(money(o.optInt("amountPaise")/100.0)+" · "+t(status.replace('_',' ')), 16, false);
        if (payment.equals("PENDING")) button("Check Test payment", () -> pilotCheckPayment(id));
        if (status.equals("CANCELLED") && !payment.equals("PENDING")) {
          label(payment.equals("REFUNDED")?"Test refund completed":payment.equals("REFUND_PENDING")?"Test refund pending":"Test refund not confirmed", 16, true);
          button("Check Test refund", () -> request(() -> api.post("/api/pilot",j("action","refund","orderId",id)), result -> {
            pilotHome(); new AlertDialog.Builder(this).setMessage(t(PaymentSafety.refundMessage(result))).setPositiveButton(t("OK"),null).show();
          }));
        }
        if (Arrays.asList("PAYMENT_PENDING","ORDER_PLACED","CONFIRMED").contains(status)) {
          final boolean paid=payment.equals("CAPTURED");
          button(paid?"Cancel & refund Test payment":"Cancel unpaid practice order", () ->
            new AlertDialog.Builder(this).setMessage(t(paid?"Cancel this practice order and request its full Razorpay Test refund? No real money moves.":"Cancel this unpaid practice order? No refund is needed."))
              .setNegativeButton(t("Keep order"),null).setPositiveButton(t("Confirm Test cancellation"),(a,w) ->
                request(() -> api.post("/api/pilot",j("action","advance","orderId",id,"role","customer","status","CANCELLED")),result -> {
                  clearPilotAttempt();pilotHome();new AlertDialog.Builder(this).setMessage(t(PaymentSafety.refundMessage(result))).setPositiveButton(t("OK"),null).show();
                })).show());
        }
        JSONArray events=o.optJSONArray("events");
        for (int n=0;events!=null&&n<events.length();n++) {
          JSONObject event=events.getJSONObject(n);
          if (event.optString("status").startsWith("REFUND")) label(event.optString("detail"),14,false);
        }
      }
      divider();
      if (!d.optBoolean("checkoutReady")) { label("Test checkout is unavailable. Live keys are never used here.",16,false); return; }
      label("Choose a Test kitchen",21,true);
      JSONArray kitchens=d.optJSONArray("kitchens");
      for(int i=0;kitchens!=null&&i<kitchens.length();i++) {
        final JSONObject kitchen=kitchens.getJSONObject(i);
        label(kitchen.optString("area")+" · "+kitchen.optString("name"),17,true);
        button("View Test menu", () -> pilotMenu(kitchen));
      }
    });
  }

  private void pilotMenu(JSONObject kitchen) {
    page("Test menu");label("Fictional kitchens · Razorpay Test only · No real money or food delivery",15,true);
    JSONArray meals=kitchen.optJSONArray("meals");
    for(int i=0;meals!=null&&i<meals.length();i++) {
      final JSONObject meal=meals.optJSONObject(i);if(meal==null)continue;
      divider();label(meal.optString("name"),21,true);label(meal.optString("description"),16,false);
      label(money(meal.optDouble("price")),18,true);
      if(!meal.optString("allergens").isEmpty())label(meal.optString("allergens"),15,false);
      if(meal.optInt("servings")>0)button("Choose Test meal", () -> pilotCheckout(kitchen,meal));
    }
    button("Test payments & refunds", () -> pilotHome());
  }

  private void pilotCheckout(JSONObject kitchen, JSONObject meal) {
    page("Test checkout");
    label("No real payment or food delivery. This uses Razorpay Test Mode only.",16,true);
    label(meal.optString("name"),22,true);
    int available=Math.max(1,Math.min(3,meal.optInt("servings")));
    String[] quantities=new String[available];for(int i=0;i<available;i++)quantities[i]=String.valueOf(i+1);
    Spinner quantity=choice("Servings",quantities);
    Spinner days=choice("Meal days",meal.optBoolean("oneTimeOnly")?new String[]{"1"}:new String[]{"1","3","4","5","6","7"});
    EditText date=field("First serving date (YYYY-MM-DD)",PracticeStore.date(0),InputType.TYPE_CLASS_DATETIME);
    TextView total=label("",21,true);
    Runnable update=()->total.setText(t("Test total")+": "+money((meal.optDouble("price")*Integer.parseInt(quantity.getSelectedItem().toString())+9)*Integer.parseInt(days.getSelectedItem().toString())));
    AdapterView.OnItemSelectedListener listener=new AdapterView.OnItemSelectedListener(){public void onItemSelected(AdapterView<?> p,View v,int n,long id){update.run();}public void onNothingSelected(AdapterView<?> p){}};
    quantity.setOnItemSelectedListener(listener);days.setOnItemSelectedListener(listener);update.run();
    label("Includes ₹9 sample delivery per day. No actual delivery or charge.",14,false);
    CheckBox acknowledge=new CheckBox(this);acknowledge.setTag("ack:Test checkout");acknowledge.setText(t("I understand this is Test Mode, with no real payment or food delivery."));acknowledge.setMinHeight(dp(48));body.addView(acknowledge);
    button("Review Test order", () -> {
      if(!acknowledge.isChecked()){info("Confirm the Test-only acknowledgement before continuing.");return;}
      String serviceDate=date.getText().toString().trim();if(!serviceDate.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")){date.setError(t("Use YYYY-MM-DD"));return;}
      int q=Integer.parseInt(quantity.getSelectedItem().toString()),n=Integer.parseInt(days.getSelectedItem().toString());
      new AlertDialog.Builder(this).setTitle(t("Review Test order")).setMessage(total.getText()+"\n"+serviceDate+"\n"+t("No real payment or food delivery. This uses Razorpay Test Mode only."))
        .setNegativeButton(t("Cancel"),null).setPositiveButton(t("Open Razorpay Test checkout"),(a,w)->startPilotPayment(kitchen,meal,q,n,serviceDate)).show();
    });
  }

  private void startPilotPayment(JSONObject kitchen,JSONObject meal,int quantity,int days,String date) {
    String selection=kitchen.optString("id")+"|"+meal.optString("id")+"|"+quantity+"|"+days+"|"+date;
    String key=getPreferences(0).getString("pilotRequestKey","");
    if(!selection.equals(getPreferences(0).getString("pilotSelection",""))||key.isEmpty()) {
      key=UUID.randomUUID().toString();getPreferences(0).edit().putString("pilotSelection",selection).putString("pilotRequestKey",key).commit();
    }
    final String requestKey=key;
    request(() -> api.post("/api/pilot",j("action","checkout","requestKey",requestKey,"kitchenId",kitchen.optString("id"),"mealId",meal.optString("id"),"quantity",quantity,"days",days,"serviceDate",date,"acknowledged",true)),d -> {
      if(d.optBoolean("paid")){clearPilotAttempt();pilotHome();return;}
      PaymentSafety.requireTestCheckout(d);
      paymentOrder=d.getString("orderId");paymentPilot=true;savePaymentContext();
      openPilotCheckout(d);
    });
  }

  // Separate method permits JVM tests to verify SDK launch arguments without opening payment UI.
  void openPilotCheckout(JSONObject d) throws Exception {
    PaymentSafety.requireTestCheckout(d);
    Checkout checkout=new Checkout();checkout.setKeyID(d.getString("key"));
    JSONObject options=j("name","Paustik Pilot","description","Test payment only — no food delivery","order_id",d.getString("providerOrderId"),"amount",d.getInt("amount"),"currency","INR","theme",j("color","#245a43"));
    paymentInProgress=true;
    try{checkout.open(this,options);}catch(Exception e){paymentInProgress=false;throw e;}
  }

  private void pilotCheckPayment(String orderId) {
    request(() -> api.post("/api/pilot",j("action","reconcile","orderId",orderId)),d -> {
      if(d.optBoolean("paid"))clearPilotAttempt();
      String message=d.optBoolean("refunded")||d.optBoolean("refundPending")?PaymentSafety.refundMessage(d):d.optBoolean("paid")?"Test payment confirmed.":"No captured Test payment found yet. You can retry the same order.";
      pilotHome();new AlertDialog.Builder(this).setMessage(t(message)).setPositiveButton(t("OK"),null).show();
    });
  }

  private void confirmPilotPayment(String paymentId,PaymentData data) {
    if(paymentOrder.isEmpty()||data==null){pilotHome();return;}
    final String orderId=paymentOrder;
    request(() -> api.post("/api/pilot",j("action","confirm","orderId",orderId,"paymentId",paymentId,"signature",data.getSignature())),d -> {
      if(d.optBoolean("paid")){clearPilotAttempt();paymentOrder="";savePaymentContext();}
      String message=d.optBoolean("refunded")||d.optBoolean("refundPending")?PaymentSafety.refundMessage(d):d.optBoolean("paid")?"Test payment confirmed.":"Test payment confirmation is pending. Check its status before retrying.";
      pilotHome();new AlertDialog.Builder(this).setMessage(t(message)).setPositiveButton(t("OK"),null).show();
    });
  }

  private void pay(String id) {
    if (BuildConfig.TEST_PAYMENTS_ONLY) { info("Testing APK only opens Test payments. No live payment was started."); return; }
    paymentOrder = id;
    paymentPilot = false;
    savePaymentContext();
    request(
        () -> api.post("/api/customer/razorpay", j("action", "checkout", "orderId", id)),
        d -> {
          Checkout checkout = new Checkout();
          checkout.setKeyID(d.getString("key"));
          JSONObject options =
              j(
                  "name",
                  "Paustik",
                  "description",
                  d.optString("description"),
                  "order_id",
                  d.getString("providerOrderId"),
                  "amount",
                  d.getInt("amount"),
                  "currency",
                  d.getString("currency"),
                  "theme",
                  j("color", "#245a43"),
                  "prefill",
                  j("email", user == null ? "" : user.optString("email")));
          paymentInProgress = true;
          try { checkout.open(this, options); } catch (Exception e) { paymentInProgress = false; throw e; }
        });
  }

  @Override
  public void onPaymentSuccess(String id, PaymentData data) {
    paymentInProgress = false;
    if (paymentPilot) { confirmPilotPayment(id, data); return; }
    if (paymentOrder.isEmpty() || data == null) {
      info("Check your order payment status before retrying.");
      return;
    }
    request(
        () ->
            api.post(
                "/api/customer/razorpay",
                j(
                    "action",
                    "confirm",
                    "orderId",
                    paymentOrder,
                    "paymentId",
                    id,
                    "signature",
                    data.getSignature())),
        r -> {
          orders();
          new AlertDialog.Builder(this)
              .setMessage(
                  t(
                      r.optBoolean("refundReviewRequired")
                          ? "Payment received after cancellation. Contact support for refund"
                              + " review."
                          : r.optBoolean("paid")
                              ? "Payment confirmed."
                              : "Payment confirmation is pending. Check order status."))
              .setPositiveButton(t("OK"), null)
              .show();
        });
  }

  @Override
  public void onPaymentError(int code, String description, PaymentData data) {
    paymentInProgress = false;
    if (paymentPilot) {
      page("Test payment status");
      label("Test payment did not complete. Check its status before retrying. No real money was charged.", 17, false);
      if (!paymentOrder.isEmpty()) button("Check Test payment", () -> pilotCheckPayment(paymentOrder));
      button("Test payments & refunds", () -> pilotHome());
      return;
    }
    page("Payment status");
    label("Payment did not complete. Check your bank or UPI app before retrying.", 17, false);
    button("Check order payment status", () -> orders());
  }

  private void products() {
    if (practiceMode) {
      page("Food shop");
      label(
          "Practice meals are available from Home. Real homemade products require sign-in.",
          17,
          false);
      button("Home", () -> home());
      return;
    }
    if (user == null) {
      signIn();
      return;
    }
    if (role().equals("MOTHER")) {
      motherProduct();
      return;
    }
    if (!role().equals("CUSTOMER")) {
      home();
      return;
    }
    page("Food shop");
    request(
        () -> api.get("/api/marketplace/products"),
        d -> {
          JSONArray rows = d.optJSONArray("products");
          if (rows == null || rows.length() == 0)
            label("No homemade products listed yet.", 16, false);
          for (int i = 0; rows != null && i < rows.length(); i++) {
            JSONObject p = rows.optJSONObject(i);
            divider();
            label(p.optString("name"), 23, true);
            label(p.optString("description"), 15, false);
            label(money(p.optDouble("price")) + " / " + p.optString("unitLabel"), 19, true);
            if (p.optJSONArray("ingredients") != null && p.optJSONArray("ingredients").length() > 0)
              label(t("Ingredients") + ": " + join(p.optJSONArray("ingredients")), 14, false);
            if (p.optJSONArray("allergens") != null && p.optJSONArray("allergens").length() > 0)
              label(t("Allergens") + ": " + join(p.optJSONArray("allergens")), 14, false);
            Spinner quantity =
                choice(
                    "Units",
                    new String[] {
                      String.valueOf(p.optInt("minQuantity", 1)),
                      String.valueOf(Math.max(2, p.optInt("minQuantity", 1))),
                      String.valueOf(Math.max(3, p.optInt("minQuantity", 1)))
                    });
            button(
                "Review product order",
                () ->
                    request(
                        () ->
                            api.post(
                                "/api/marketplace/product-requests",
                                j(
                                    "action",
                                    "create",
                                    "productId",
                                    p.optString("id"),
                                    "quantity",
                                    Integer.parseInt(quantity.getSelectedItem().toString()))),
                        created -> productQuote(created.getString("id"))));
          }
        });
  }

  private void productQuote(String id) {
    request(
        () -> api.post("/api/checkout/quote", j("productRequestId", id)),
        quote -> {
          page("Checkout");
          label(t("Total") + ": " + money(quote.optDouble("total")), 24, true);
          label(t("Delivery") + ": " + money(quote.optDouble("deliveryFee")), 16, false);
          button(
              "Place product order",
              () ->
                  request(
                      () -> api.get("/api/marketplace/product-requests"),
                      list -> {
                        JSONArray rs = list.optJSONArray("requests");
                        for (int i = 0; rs != null && i < rs.length(); i++) {
                          JSONObject r = rs.getJSONObject(i);
                          if (r.optString("id").equals(id)) {
                            request(
                                () ->
                                    api.post(
                                        "/api/marketplace/product-requests",
                                        j(
                                            "action",
                                            "confirm",
                                            "requestId",
                                            id,
                                            "version",
                                            r.getInt("version"),
                                            "quoteId",
                                            quote.getString("quoteId"))),
                                saved -> orders());
                            return;
                          }
                        }
                        info("Refresh products and try again.");
                      }));
        });
  }

  private void mother() {
    page("Your Mother Kitchen");
    button("Refresh orders", () -> mother());
    button("Add a meal", () -> mealEditor(false));
    button("One-day special", () -> mealEditor(true));
    button("Add homemade product", () -> motherProduct());
    request(
        () -> api.get("/api/mother/menu"),
        d -> {
          workspace = d;
          JSONObject k = d.optJSONObject("kitchen");
          label(k == null ? "" : k.optString("name"), 23, true);
          if (k != null && !k.optBoolean("approved"))
            label("Your kitchen is awaiting approval. You can save drafts.", 16, false);
          label(t("Recorded earnings") + ": " + money(d.optDouble("earningsRecorded")), 20, true);
          JSONArray rows = d.optJSONArray("orders");
          label("Incoming orders", 23, true);
          for (int i = 0; rows != null && i < rows.length(); i++) {
            JSONObject o = rows.getJSONObject(i);
            divider();
            label(o.optString("orderNumber"), 18, true);
            label(join(o.optJSONArray("items")), 15, false);
            label(o.optString("status").replace('_', ' '), 15, true);
            String s = o.optString("status");
            if (s.equals("ORDER_PLACED")) motherAction(o, "Accept order", "CONFIRMED");
            if (s.equals("CONFIRMED")) motherAction(o, "Start cooking", "PREPARING");
            if (s.equals("PREPARING")) motherAction(o, "Ready for pickup", "READY_FOR_PICKUP");
            if (s.equals("PREPARING")
                || s.equals("READY_FOR_PICKUP")
                || s.equals("DELIVERY_ASSIGNED")) {
              button("Prepared meal photo", () -> pickPhoto(o.optString("id"), "PREPARED"));
              if (!s.equals("PREPARING"))
                button("Courier handover photo", () -> pickPhoto(o.optString("id"), "HANDOVER"));
            }
            if (s.equals("DELIVERY_ASSIGNED"))
              button(
                  "Show pickup code",
                  () ->
                      request(
                          () ->
                              api.get(
                                  "/api/mother/pickup-code?orderId="
                                      + Uri.encode(o.optString("id"))),
                          code -> {
                            new AlertDialog.Builder(this)
                                .setTitle(t("Pickup code"))
                                .setMessage(code.optString("code", code.optString("pickupCode")))
                                .setPositiveButton(t("OK"), null)
                                .show();
                          }));
          }
          label("Scheduled meals", 23, true);
          JSONArray menus = d.optJSONArray("menus");
          for (int i = 0; menus != null && i < menus.length(); i++) {
            JSONObject m = menus.getJSONObject(i);
            label(
                m.optString("name")
                    + " · "
                    + m.optString("serviceDate")
                    + " · "
                    + m.optInt("servings"),
                15,
                false);
          }
        });
  }

  private void motherAction(JSONObject order, String title, String status) {
    button(
        title,
        () ->
            request(
                () ->
                    api.call(
                        "PATCH",
                        "/api/mother/orders/" + order.optString("id"),
                        j("status", status)),
                r -> mother()));
  }

  private void mealEditor(boolean special) {
    page(special ? "One-day special" : "Add a meal");
    EditText name = field("Meal name", "", InputType.TYPE_CLASS_TEXT),
        description =
            field("Description, ingredients and allergens", "", InputType.TYPE_CLASS_TEXT);
    Spinner type =
        choice(
            "Meal type",
            new String[] {
              "Vegetarian meal",
              "Egg meal",
              "Paneer meal",
              "Chicken meal",
              "Desi chicken meal",
              "Mutton meal",
              "Mushroom meal"
            });
    EditText price = field("Price", "69", InputType.TYPE_CLASS_NUMBER),
        servings = field("Servings", "10", InputType.TYPE_CLASS_NUMBER),
        date = field("Serving date", PracticeStore.date(1), InputType.TYPE_CLASS_DATETIME),
        time = field("Delivery time", "12:30", InputType.TYPE_CLASS_DATETIME);
    date.setFocusable(false);
    date.setOnClickListener(
        v -> {
          Calendar now = Calendar.getInstance();
          DatePickerDialog picker =
              new DatePickerDialog(
                  this,
                  (a, y, m, day) ->
                      date.setText(String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, day)),
                  now.get(Calendar.YEAR),
                  now.get(Calendar.MONTH),
                  now.get(Calendar.DAY_OF_MONTH));
          now.set(Calendar.HOUR_OF_DAY, 0);
          now.set(Calendar.MINUTE, 0);
          now.set(Calendar.SECOND, 0);
          now.set(Calendar.MILLISECOND, 0);
          picker.getDatePicker().setMinDate(now.getTimeInMillis());
          picker.show();
        });
    time.setFocusable(false);
    time.setOnClickListener(
        v ->
            new TimePickerDialog(
                    this,
                    (a, h, m) -> time.setText(String.format(Locale.US, "%02d:%02d", h, m)),
                    12,
                    30,
                    true)
                .show());
    type.setOnItemSelectedListener(
        new android.widget.AdapterView.OnItemSelectedListener() {
          public void onNothingSelected(android.widget.AdapterView<?> p) {}

          public void onItemSelected(
              android.widget.AdapterView<?> p, View v, int position, long id) {
            int minimum = new int[] {69, 79, 89, 99, 120, 150, 69}[position];
            try {
              if (!special && Double.parseDouble(price.getText().toString()) < minimum)
                price.setText(String.valueOf(minimum));
            } catch (Exception e) {
              price.setText(String.valueOf(minimum));
            }
          }
        });
    button(
        "Save meal",
        () -> {
          try {
            request(
                () ->
                    api.post(
                        "/api/mother/menu",
                        j(
                            "name",
                            name.getText().toString(),
                            "description",
                            description.getText().toString(),
                            "tier",
                            new String[] {
                                  "BASE",
                                  "EGG",
                                  "CHEESE",
                                  "CHICKEN",
                                  "DESI_CHICKEN",
                                  "MUTTON",
                                  "MUSHROOM"
                                }
                                [type.getSelectedItemPosition()],
                            "price",
                            Double.valueOf(price.getText().toString()),
                            "servings",
                            Integer.valueOf(servings.getText().toString()),
                            "serviceDate",
                            date.getText().toString(),
                            "deliveryTime",
                            time.getText().toString(),
                            "mealPeriod",
                            Integer.parseInt(time.getText().toString().split(":")[0]) < 11
                                ? "BREAKFAST"
                                : Integer.parseInt(time.getText().toString().split(":")[0]) < 17
                                    ? "LUNCH"
                                    : "DINNER",
                            "oneTimeOnly",
                            special,
                            "components",
                            new JSONArray())),
                d -> mother());
          } catch (Exception e) {
            info("Check the meal details.");
          }
        });
  }

  private void motherProduct() {
    page("Add homemade product");
    EditText name = field("Product name", "", InputType.TYPE_CLASS_TEXT),
        desc = field("Description", "", InputType.TYPE_CLASS_TEXT),
        unit = field("Pack or unit", "500 g pack", InputType.TYPE_CLASS_TEXT),
        price = field("Price", "80", InputType.TYPE_CLASS_NUMBER),
        stock = field("Units available", "10", InputType.TYPE_CLASS_NUMBER),
        ingredients = field("Ingredients", "", InputType.TYPE_CLASS_TEXT),
        allergens = field("Allergens", "", InputType.TYPE_CLASS_TEXT),
        storage = field("Storage instructions", "Keep dry and sealed", InputType.TYPE_CLASS_TEXT);
    Spinner category = choice("Category", new String[] {"Sattu", "Sweets", "Pickles", "Other"});
    Spinner diet = choice("Food type", new String[] {"Vegetarian", "Vegan", "Non-vegetarian"});
    button(
        "Save product",
        () ->
            request(
                () ->
                    api.post(
                        "/api/mother/products",
                        j(
                            "name",
                            name.getText().toString(),
                            "description",
                            desc.getText().toString(),
                            "unitLabel",
                            unit.getText().toString(),
                            "price",
                            Double.valueOf(price.getText().toString()),
                            "stock",
                            Integer.valueOf(stock.getText().toString()),
                            "ingredients",
                            ingredients.getText().toString(),
                            "allergens",
                            allergens.getText().toString(),
                            "storage",
                            storage.getText().toString(),
                            "category",
                            new String[] {"SATTU", "SWEETS", "PICKLES", "OTHER"}
                                [category.getSelectedItemPosition()],
                            "diet",
                            new String[] {"VEGETARIAN", "VEGAN", "NON_VEGETARIAN"}
                                [diet.getSelectedItemPosition()],
                            "minQuantity",
                            1,
                            "mode",
                            "MADE_TO_ORDER",
                            "prepMinutes",
                            60,
                            "shelfLifeHours",
                            24,
                            "readyUntil",
                            null,
                            "active",
                            true)),
                d -> mother()));
  }

  private void courier() {
    page("Your deliveries");
    button("Refresh deliveries", () -> courier());
    button("Service area", () -> courierArea());
    request(
        () -> api.get("/api/delivery/jobs"),
        d -> {
          JSONObject area = d.optJSONObject("area");
          if (area != null)
            label(
                (area.optBoolean("online") ? t("Online") : t("Offline"))
                    + " · "
                    + area.optString("city")
                    + " · "
                    + area.optInt("radiusKm")
                    + " km",
                17,
                true);
          String[] groups = {"assigned", "available", "upcoming"};
          for (String group : groups) {
            label(
                group.equals("assigned")
                    ? "Assigned deliveries"
                    : group.equals("available") ? "Ready nearby" : "Scheduled deliveries",
                22,
                true);
            if (group.equals("assigned") && area != null) {
              button(
                  area.optBoolean("online") ? "Go offline" : "Go online",
                  () ->
                      request(
                          () ->
                              api.post(
                                  "/api/delivery/availability",
                                  area.optBoolean("online")
                                      ? j("isAvailable", false)
                                      : j(
                                          "isAvailable",
                                          true,
                                          "useSavedPin",
                                          true,
                                          "radiusKm",
                                          25,
                                          "mealCapacity",
                                          d.optJSONObject("capacity").optInt("mealCapacity", 6),
                                          "consent",
                                          true)),
                          r -> courier()));
            }
            JSONArray rows = d.optJSONArray(group);
            if (rows == null || rows.length() == 0) label("No deliveries here yet.", 15, false);
            for (int i = 0; rows != null && i < rows.length(); i++) {
              JSONObject job = rows.getJSONObject(i);
              divider();
              label(job.optString("orderNumber"), 18, true);
              label(job.optString("pickup") + " → " + job.optString("dropoff"), 15, false);
              label(
                  t("Scheduled for") + ": " + displaySchedule(job.optString("scheduledFor")),
                  14,
                  false);
              if (group.equals("upcoming"))
                label("Available to accept after the kitchen marks the food ready.", 14, false);
              label(
                  t("Estimated earnings") + ": " + money(job.optDouble("estimatedPay")), 16, true);
              String id = job.optString("deliveryId"), status = job.optString("deliveryStatus");
              if (group.equals("available")) {
                button(
                    "Accept delivery",
                    () ->
                        request(
                            () -> api.post("/api/delivery/jobs", j("deliveryId", id)),
                            r -> courier()));
                button(
                    "Decline offer",
                    () ->
                        request(
                            () ->
                                api.post(
                                    "/api/delivery/offers/decline",
                                    j("orderId", job.optString("orderId"))),
                            r -> courier()));
              } else if (group.equals("assigned")) {
                String next =
                    status.equals("ACCEPTED")
                        ? "GOING_TO_PICKUP"
                        : status.equals("GOING_TO_PICKUP")
                            ? "PICKED_UP"
                            : status.equals("PICKED_UP")
                                ? "OUT_FOR_DELIVERY"
                                : status.equals("OUT_FOR_DELIVERY") ? "DELIVERED" : "";
                if (!next.isEmpty())
                  button(
                      next.equals("GOING_TO_PICKUP")
                          ? "Go to pickup"
                          : next.equals("PICKED_UP")
                              ? "Confirm pickup"
                              : next.equals("OUT_FOR_DELIVERY")
                                  ? "Start delivery"
                                  : "Confirm delivery",
                      () -> courierStep(id, next));
              }
            }
          }
        });
  }

  private void courierStep(String id, String next) {
    if (next.equals("PICKED_UP") || next.equals("DELIVERED")) {
      EditText code = new EditText(this);
      code.setInputType(InputType.TYPE_CLASS_NUMBER);
      code.setHint(t("6-digit handover code"));
      new AlertDialog.Builder(this)
          .setTitle(t(next.equals("PICKED_UP") ? "Kitchen pickup code" : "Customer delivery code"))
          .setView(code)
          .setNegativeButton(t("Cancel"), null)
          .setPositiveButton(
              t("Verify code"),
              (a, w) ->
                  request(
                      () ->
                          api.call(
                              "PATCH",
                              "/api/delivery/jobs/" + id,
                              j("status", next, "method", "OTP", "otp", code.getText().toString())),
                      r -> courier()))
          .show();
    } else
      request(
          () -> api.call("PATCH", "/api/delivery/jobs/" + id, j("status", next)), r -> courier());
  }

  private String displaySchedule(String value) {
    try {
      SimpleDateFormat input = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US);
      SimpleDateFormat output =
          new SimpleDateFormat("EEE, d MMM · h:mm a 'IST'", new Locale(language));
      output.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
      return output.format(input.parse(value));
    } catch (Exception e) {
      return value;
    }
  }

  private void pickPhoto(String orderId, String stage) {
    photoOrder = orderId;
    photoStage = stage;
    Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
    picker.addCategory(Intent.CATEGORY_OPENABLE);
    picker.setType("image/*");
    startActivityForResult(picker, 51);
  }

  @Override
  protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    if (request != 51
        || result != RESULT_OK
        || data == null
        || data.getData() == null
        || photoOrder == null) return;
    final Uri uri = data.getData();
    final String id = photoOrder, stage = photoStage;
    request(
        () -> {
          BitmapFactory.Options options = new BitmapFactory.Options();
          options.inJustDecodeBounds = true;
          try (InputStream in = getContentResolver().openInputStream(uri)) {
            BitmapFactory.decodeStream(in, null, options);
          }
          if (options.outWidth < 1 || options.outHeight < 1)
            throw new IOException("Choose a valid photo.");
          options.inSampleSize = 1;
          while (Math.max(options.outWidth, options.outHeight) / options.inSampleSize > 640)
            options.inSampleSize *= 2;
          options.inJustDecodeBounds = false;
          Bitmap bitmap;
          try (InputStream in = getContentResolver().openInputStream(uri)) {
            bitmap = BitmapFactory.decodeStream(in, null, options);
          }
          if (bitmap == null) throw new IOException("Choose a valid photo.");
          try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, output);
            while (output.size() > 195000
                && Math.max(bitmap.getWidth(), bitmap.getHeight()) > 128) {
              Bitmap smaller =
                  Bitmap.createScaledBitmap(
                      bitmap,
                      Math.max(1, bitmap.getWidth() * 3 / 4),
                      Math.max(1, bitmap.getHeight() * 3 / 4),
                      true);
              bitmap.recycle();
              bitmap = smaller;
              output.reset();
              bitmap.compress(Bitmap.CompressFormat.PNG, 100, output);
            }
            if (output.size() > 195000) throw new IOException("Choose a smaller photo.");
            return api.post(
                "/api/order-photos",
                j(
                    "orderId",
                    id,
                    "stage",
                    stage,
                    "image",
                    "data:image/png;base64,"
                        + android.util.Base64.encodeToString(
                            output.toByteArray(), android.util.Base64.NO_WRAP)));
          } finally {
            bitmap.recycle();
          }
        },
        r -> {
          mother();
          info("Order photo saved.");
        });
  }

  private void courierArea() {
    request(
        () -> api.get("/api/delivery/jobs"),
        d -> {
          page("Service area");
          JSONObject area = d.optJSONObject("area"),
              pin = area == null ? null : area.optJSONObject("pin");
          EditText town =
              field("City", area == null ? "" : area.optString("city"), InputType.TYPE_CLASS_TEXT);
          latitudeInput =
              field(
                  "Latitude",
                  pin == null ? "" : pin.optString("latitude"),
                  InputType.TYPE_CLASS_NUMBER
                      | InputType.TYPE_NUMBER_FLAG_DECIMAL
                      | InputType.TYPE_NUMBER_FLAG_SIGNED);
          longitudeInput =
              field(
                  "Longitude",
                  pin == null ? "" : pin.optString("longitude"),
                  InputType.TYPE_CLASS_NUMBER
                      | InputType.TYPE_NUMBER_FLAG_DECIMAL
                      | InputType.TYPE_NUMBER_FLAG_SIGNED);
          label(
              "Pickup offers within 25 km. A normal collection batch has at most three orders.",
              14,
              false);
          button("Use current location", () -> gps());
          button(
              "Save area and go online",
              () -> {
                try {
                  JSONObject value =
                      j(
                          "isAvailable",
                          true,
                          "latitude",
                          Double.valueOf(latitudeInput.getText().toString()),
                          "longitude",
                          Double.valueOf(longitudeInput.getText().toString()),
                          "city",
                          town.getText().toString(),
                          "radiusKm",
                          25,
                          "mealCapacity",
                          d.optJSONObject("capacity").optInt("mealCapacity", 6),
                          "consent",
                          true);
                  request(() -> api.post("/api/delivery/availability", value), r -> courier());
                } catch (Exception e) {
                  info("Enter valid delivery coordinates or leave both empty.");
                }
              });
        });
  }

  private void photoCredits() {
    page("Photo credits");
    try {
      JSONObject credits = new JSONObject(assetText("photo-credits.json"));
      JSONArray photos = credits.getJSONArray("photos");
      for (int i = 0; i < photos.length(); i++) {
        JSONObject photo = photos.getJSONObject(i);
        label(
            photo.optString("file") + " · " + photo.optString("author", "Pexels contributor"),
            15,
            true);
        TextView source = label(photo.optString("source"), 13, false);
        source.setAutoLinkMask(android.text.util.Linkify.WEB_URLS);
        TextView license =
            label(photo.optString("license", credits.optString("license")), 13, false);
        license.setAutoLinkMask(android.text.util.Linkify.WEB_URLS);
        label(photo.optString("changes"), 12, false);
      }
    } catch (Exception e) {
      error(e);
    }
  }

  private void help() {
    page("Privacy & support");
    button("Photo credits", () -> photoCredits());
    label(
        "Paustik connects customers with local Mother Kitchens. Availability depends on published"
            + " menus and local delivery coverage.",
        16,
        false);
    label(
        "Offline practice stays on this device. Signed-in Test payments use Razorpay Test Mode and Paustik's server. No real money or food delivery.",
        16,
        false);
    label(
        "Your account, saved address and real orders are handled by Paustik. Passwords are not"
            + " saved in the app. Session access is encrypted using Android Keystore.",
        15,
        false);
    label(
        "Location is requested only when you choose to save a delivery pin. The app does not"
            + " collect background location.",
        15,
        false);
    label(
        "Razorpay handles payment details. The app confirms payment with Paustik's server before"
            + " showing it as paid.",
        15,
        false);
    button(
        "Email support",
        () -> {
          Intent email =
              new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:paustikdelivery@gmail.com"));
          try {
            startActivity(email);
          } catch (Exception e) {
            info("Email paustikdelivery@gmail.com for help.");
          }
        });
    TextView policy = label("Privacy Policy: https://paustik.in/privacy", 14, false);
    policy.setAutoLinkMask(android.text.util.Linkify.WEB_URLS);
    label("Paustik 1.4.0 · Native Android customer, kitchen and delivery screens.", 13, false);
  }
}
