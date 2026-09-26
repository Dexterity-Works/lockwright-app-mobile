package com.pears.pass.autofill.utils;

import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * Utility class for secure buffer handling of sensitive data like passwords.
 * Provides methods to convert strings to byte arrays and securely clear them after use.
 */
public final class SecureBufferUtils {

    private SecureBufferUtils() {
        // Prevent instantiation
    }

    /**
     * Converts a string to a UTF-8 encoded byte array.
     *
     * @param str The string to convert
     * @return UTF-8 encoded byte array
     */
    public static byte[] stringToBuffer(String str) {
        if (str == null) {
            return new byte[0];
        }
        return str.getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Securely clears a byte array by overwriting with zeros.
     * This helps prevent sensitive data from remaining in memory.
     *
     * @param buffer The byte array to clear
     */
    public static void clearBuffer(byte[] buffer) {
        if (buffer != null && buffer.length > 0) {
            Arrays.fill(buffer, (byte) 0);
        }
    }

    /**
     * Converts a byte array to Base64 encoded string.
     * Used for transmitting binary data over JSON/RPC.
     *
     * @param buffer The byte array to encode
     * @return Base64 encoded string
     */
    public static String toBase64(byte[] buffer) {
        if (buffer == null || buffer.length == 0) {
            return "";
        }
        return Base64.encodeToString(buffer, Base64.NO_WRAP);
    }

}
