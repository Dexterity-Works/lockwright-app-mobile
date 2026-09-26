package com.pears.pass.autofill.utils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import javax.net.ssl.HttpsURLConnection;

/**
 * Reads a site's assetlinks.json over HTTPS. Short timeouts, no redirects
 * (Digital Asset Links forbids them), a size cap, and a debug line when it
 * fails; the verifier then fails closed.
 */
public final class AssetLinksHttpFetcher implements AssetLinksVerifier.Fetcher {
    private static final String TAG = "AssetLinksHttpFetcher";
    private static final int TIMEOUT_MS = 3000;
    private static final int MAX_BYTES = 256 * 1024;

    @Override
    public List<Map<String, Object>> fetch(String url) throws Exception {
        try {
            HttpsURLConnection connection = (HttpsURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", "application/json");
            try {
                if (connection.getResponseCode() != 200) {
                    throw new IOException("HTTP " + connection.getResponseCode());
                }
                String body = readCapped(connection.getInputStream());
                List<Map<String, Object>> statements = new ArrayList<>();
                JSONArray array = new JSONArray(body);
                for (int i = 0; i < array.length(); i++) {
                    Object statement = toJava(array.get(i));
                    if (statement instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> map = (Map<String, Object>) statement;
                        statements.add(map);
                    }
                }
                return statements;
            } finally {
                connection.disconnect();
            }
        } catch (Exception e) {
            SecureLog.d(TAG, "assetlinks fetch failed, not listing: " + url + " " + e);
            throw e;
        }
    }

    private static String readCapped(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) != -1) {
            out.write(buf, 0, n);
            if (out.size() > MAX_BYTES) throw new IOException("assetlinks.json over " + MAX_BYTES + " bytes");
        }
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }

    private static Object toJava(Object value) throws Exception {
        if (value instanceof JSONObject) {
            JSONObject obj = (JSONObject) value;
            Map<String, Object> map = new HashMap<>();
            Iterator<String> keys = obj.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                map.put(key, toJava(obj.get(key)));
            }
            return map;
        }
        if (value instanceof JSONArray) {
            JSONArray arr = (JSONArray) value;
            List<Object> list = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) list.add(toJava(arr.get(i)));
            return list;
        }
        return JSONObject.NULL.equals(value) ? null : value;
    }
}
