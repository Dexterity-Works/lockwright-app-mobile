package com.pears.pass.autofill.utils;

import java.util.Map;

/**
 * Epoch key gate for the autofill process. The vault core lists every record
 * it can still open, so a device without the latest epoch key would offer
 * items sealed under older keys. Autofill fills only while the active vault's
 * epoch status says this device can read the latest key and was not revoked.
 */
public final class VaultEpochGate {
    /** Same text as the vault core's deferred migrate error. */
    public static final String KEY_PENDING = "epoch-key-pending";
    /** This device was let go from the vault. */
    public static final String REVOKED = "epoch-revoked";

    private VaultEpochGate() {}

    public static boolean canFill(Map<String, Object> status) {
        if (status == null) {
            return false;
        }
        return Boolean.TRUE.equals(status.get("canRead"))
                && !Boolean.TRUE.equals(status.get("revoked"));
    }

    /** Null when this device can fill, else KEY_PENDING or REVOKED. */
    public static String failure(Map<String, Object> status) {
        if (canFill(status)) return null;
        return status != null && Boolean.TRUE.equals(status.get("revoked")) ? REVOKED : KEY_PENDING;
    }

    public static boolean isKeyPending(Throwable error) {
        return hasMessage(error, KEY_PENDING);
    }

    public static boolean isRevoked(Throwable error) {
        return hasMessage(error, REVOKED);
    }

    /** What the empty sheet says for an epoch failure, or null for any other error. */
    public static String sheetMessage(Throwable error) {
        if (isRevoked(error)) return "This device no longer has access to this vault.";
        if (isKeyPending(error)) return "This vault is updating its keys. Open Lockwright to finish.";
        return null;
    }

    private static boolean hasMessage(Throwable error, String text) {
        for (Throwable current = error; current != null; current = current.getCause()) {
            String message = current.getMessage();
            if (message != null && message.contains(text)) return true;
        }
        return false;
    }
}
