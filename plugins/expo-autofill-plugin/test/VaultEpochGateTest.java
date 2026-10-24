package com.pears.pass.autofill.utils;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Real checks against VaultEpochGate. A silent pass means autofill lists
 * nothing while this device can't open the vault's latest epoch key: a
 * joiner whose key has not arrived, a revoked device, or a deferred migrate.
 */
public final class VaultEpochGateTest {
    private static int failures = 0;

    public static void main(String[] args) {
        readableKeyFills();
        legacyVaultFills();
        missingKeyFailsClosed();
        revokedFailsClosed();
        missingStatusFailsClosed();
        missingCanReadFailsClosed();
        pendingErrorIsKeyPending();
        wrappedPendingErrorIsKeyPending();
        otherErrorIsNotKeyPending();

        if (failures > 0) {
            System.err.println(failures + " VaultEpochGate checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static Map<String, Object> status(boolean canRead, boolean revoked) {
        Map<String, Object> status = new HashMap<>();
        status.put("vaultId", "v1");
        status.put("epoch", "e1");
        status.put("legacy", false);
        status.put("canRead", canRead);
        status.put("revoked", revoked);
        return status;
    }

    private static void readableKeyFills() {
        expect("current key fills", VaultEpochGate.canFill(status(true, false)), true);
    }

    private static void legacyVaultFills() {
        Map<String, Object> status = status(true, false);
        status.put("legacy", true);
        status.put("epoch", null);
        expect("legacy vault fills", VaultEpochGate.canFill(status), true);
    }

    private static void missingKeyFailsClosed() {
        expect("no current key fails closed",
                VaultEpochGate.canFill(status(false, false)), false);
    }

    private static void revokedFailsClosed() {
        expect("revoked fails closed", VaultEpochGate.canFill(status(false, true)), false);
        expect("revoked fails closed even if a key reads",
                VaultEpochGate.canFill(status(true, true)), false);
    }

    private static void missingStatusFailsClosed() {
        expect("null status fails closed", VaultEpochGate.canFill(null), false);
    }

    private static void missingCanReadFailsClosed() {
        Map<String, Object> status = status(true, false);
        status.remove("canRead");
        expect("status without canRead fails closed", VaultEpochGate.canFill(status), false);
        status.put("canRead", "true");
        expect("non-boolean canRead fails closed", VaultEpochGate.canFill(status), false);
    }

    private static void pendingErrorIsKeyPending() {
        expect("gate error is key pending",
                VaultEpochGate.isKeyPending(new RuntimeException(VaultEpochGate.KEY_PENDING)),
                true);
    }

    private static void wrappedPendingErrorIsKeyPending() {
        Exception failure = new ExecutionException(
                new RuntimeException("epoch-key-pending"));
        expect("wrapped gate error is key pending", VaultEpochGate.isKeyPending(failure), true);
    }

    private static void otherErrorIsNotKeyPending() {
        expect("other error is not key pending",
                VaultEpochGate.isKeyPending(new RuntimeException("Failed to activate vault")),
                false);
        expect("null error is not key pending", VaultEpochGate.isKeyPending(null), false);
    }

    private static void expect(String label, Object got, Object want) {
        if (got == null ? want != null : !got.equals(want)) {
            failures++;
            System.err.println("FAIL " + label + ": got " + got + ", want " + want);
        }
    }
}
