package in.paustik.mobile;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.io.*;
import java.net.HttpCookie;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Native API client. Only the app's configured origin receives the session cookie. */
class NativeApi {
  private final Context context;
  private final String origin;
  private String session;
  private String googleNonceCookie;

  static final class Failure extends Exception {
    final int code;

    Failure(int code, String message) {
      super(message);
      this.code = code;
    }
  }

  NativeApi(Context context) {
    this.context = context.getApplicationContext();
    this.origin = BuildConfig.API_BASE_URL;
    try {
      String value = context.getSharedPreferences("native-session", 0).getString("session", "");
      if (!value.isEmpty()) {
        String[] pieces = value.split(":");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(
            Cipher.DECRYPT_MODE,
            key(),
            new GCMParameterSpec(128, Base64.decode(pieces[0], Base64.NO_WRAP)));
        session =
            new String(
                cipher.doFinal(Base64.decode(pieces[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
      }
    } catch (Exception ignored) {
      clear();
    }
  }

  boolean signedIn() {
    return session != null && !session.isEmpty();
  }

  String origin() {
    return origin;
  }

  void clear() {
    session = null;
    context.getSharedPreferences("native-session", 0).edit().remove("session").apply();
  }

  private SecretKey key() throws Exception {
    KeyStore store = KeyStore.getInstance("AndroidKeyStore");
    store.load(null);
    if (store.containsAlias("paustik-session-v1"))
      return ((KeyStore.SecretKeyEntry) store.getEntry("paustik-session-v1", null)).getSecretKey();
    KeyGenerator generator =
        KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
    generator.init(
        new KeyGenParameterSpec.Builder(
                "paustik-session-v1", KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .build());
    return generator.generateKey();
  }

  private void save(String token) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key());
    String value =
        Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)
            + ":"
            + Base64.encodeToString(
                cipher.doFinal(token.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
    context.getSharedPreferences("native-session", 0).edit().putString("session", value).apply();
    session = token;
  }

  JSONObject get(String path) throws Exception {
    return call("GET", path, null);
  }

  JSONObject post(String path, JSONObject data) throws Exception {
    return call("POST", path, data);
  }

  byte[] orderPhoto(String orderId, String stage) throws Exception {
    return orderPhoto(orderId, stage, false);
  }

  byte[] orderPhoto(String orderId, String stage, boolean pilot) throws Exception {
    if (!orderId.matches("[0-9a-fA-F-]{36}") || !(stage.equals("PREPARED") || stage.equals("HANDOVER")))
      throw new Failure(400, "Invalid order photo.");
    URL url = new URL(origin + "/api/order-photos?orderId=" + orderId + (pilot ? "&pilot=1" : "") + "&image=" + stage);
    if (!url.getProtocol().equals("https")) throw new Failure(400, "A secure connection is required.");
    HttpURLConnection c = (HttpURLConnection) url.openConnection();
    try {
      c.setConnectTimeout(12000); c.setReadTimeout(15000); c.setInstanceFollowRedirects(false);
      c.setUseCaches(false); c.setRequestProperty("Accept", "image/png");
      if (signedIn()) c.setRequestProperty("Cookie", "paustik_session=" + session);
      if (c.getResponseCode() != 200 || !"image/png".equals(c.getContentType()))
        throw new Failure(404, "Order photo unavailable. Please refresh.");
      try (InputStream input = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
        byte[] buffer = new byte[8192]; int n;
        while ((n = input.read(buffer)) != -1) {
          if (out.size() + n > 210000) throw new Failure(413, "Order photo is too large.");
          out.write(buffer, 0, n);
        }
        return out.toByteArray();
      }
    } finally { c.disconnect(); }
  }

  JSONObject call(String method, String path, JSONObject data) throws Exception {
    if (!path.startsWith("/api/") || path.contains("..") || path.contains("\\"))
      throw new Failure(400, "Invalid app request.");
    if (BuildConfig.TEST_PAYMENTS_ONLY && !method.equals("GET")
        && !path.startsWith("/api/auth/") && !path.equals("/api/pilot"))
      throw new Failure(403, "Testing APK: live account and order changes are disabled. Use Test payments.");
    URL url = new URL(origin + path);
    if (!url.getProtocol().equals("https") && !BuildConfig.DEBUG)
      throw new Failure(400, "A secure connection is required.");
    HttpURLConnection c = (HttpURLConnection) url.openConnection();
    try {
      c.setRequestMethod(method);
      c.setConnectTimeout(12000);
      c.setReadTimeout(45000);
      c.setInstanceFollowRedirects(false);
      c.setRequestProperty("Accept", "application/json");
      c.setRequestProperty("Origin", origin);
      c.setRequestProperty("User-Agent", "Paustik-Android/" + BuildConfig.VERSION_NAME);
      String cookieHeader = signedIn() ? "paustik_session=" + session : "";
      if (googleNonceCookie != null) cookieHeader += (cookieHeader.isEmpty() ? "" : "; ") + "paustik_google_nonce=" + googleNonceCookie;
      if (!cookieHeader.isEmpty()) c.setRequestProperty("Cookie", cookieHeader);
      if (data != null) {
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        byte[] bytes = data.toString().getBytes(StandardCharsets.UTF_8);
        c.setFixedLengthStreamingMode(bytes.length);
        try (OutputStream output = c.getOutputStream()) {
          output.write(bytes);
        }
      }
      int status = c.getResponseCode();
      InputStream stream = status >= 400 ? c.getErrorStream() : c.getInputStream();
      String response = read(stream, 3000000);
      JSONObject result;
      try {
        result = new JSONObject(response);
      } catch (Exception error) {
        throw new Failure(status, "App services are temporarily unavailable. Please retry.");
      }
      if (status >= 400)
        throw new Failure(status, result.optString("error", "The request could not be completed."));
      java.util.List<String> cookies = c.getHeaderFields().get("Set-Cookie");
      if (cookies == null) cookies = c.getHeaderFields().get("set-cookie");
      if (cookies != null)
        for (String header : cookies)
          for (HttpCookie cookie : HttpCookie.parse(header))
            if (cookie.getName().equals("paustik_google_nonce")) {
              googleNonceCookie = cookie.getMaxAge() == 0 ? null : cookie.getValue();
            } else if (cookie.getName().equals("paustik_session")) {
              if (cookie.getMaxAge() == 0 || cookie.getValue().isEmpty()) clear();
              else save(cookie.getValue());
            }
      return result;
    } finally {
      c.disconnect();
    }
  }

  private static String read(InputStream stream, int maximum) throws Exception {
    if (stream == null) return "{}";
    try (InputStream input = stream;
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] buffer = new byte[8192];
      int n;
      while ((n = input.read(buffer)) != -1) {
        if (out.size() + n > maximum) throw new Failure(413, "The response is too large.");
        out.write(buffer, 0, n);
      }
      return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }
  }
}
