package com.pears.pass.autofill.utils;

import java.util.HashMap;
import java.util.Map;

/**
 * Real checks against VaultMigrationGate. A silent pass means autofill will
 * wait for schema 2 migrate before listing, and will not treat a half-copied
 * v2 namespace as ready.
 */
public final class VaultMigrationGateTest {
    private static int failures = 0;

    public static void main(String[] args) {
        readyWhenSchema2();
        notReadyWhenSchema1();
        retryWhileInProgress();
        failOnTerminalError();
        deferredEpochKeyFailsClosed();
        inProgressErrorIsRetry();
        jsonNumberReady();
        nullIsRetry();
        timeoutAfterSixtySeconds();

        if (failures > 0) {
            System.err.println(failures + " VaultMigrationGate checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void readyWhenSchema2() {
        Map<String, Object> status = new HashMap<>();
        status.put("ready", true);
        status.put("migratedToSchema", 2);
        status.put("inProgress", false);
        expect("schema 2 ready", VaultMigrationGate.decide(status), VaultMigrationGate.Decision.READY);
    }

    private static void notReadyWhenSchema1() {
        Map<String, Object> status = new HashMap<>();
        status.put("ready", true);
        status.put("migratedToSchema", 1);
        expect("schema 1 not ready", VaultMigrationGate.decide(status), VaultMigrationGate.Decision.RETRY);
    }

    private static void retryWhileInProgress() {
        Map<String, Object> status = new HashMap<>();
        status.put("ready", false);
        status.put("inProgress", true);
        status.put("migratedToSchema", null);
        expect("in progress retries", VaultMigrationGate.decide(status), VaultMigrationGate.Decision.RETRY);
    }

    private static void failOnTerminalError() {
        Map<String, Object> status = new HashMap<>();
        status.put("ready", false);
        status.put("inProgress", false);
        status.put("error", "migrate exploded");
        expect("terminal error fails", VaultMigrationGate.decide(status), VaultMigrationGate.Decision.FAILED);
    }

    /**
     * Residual: the worklet defers migrate until the latest epoch key is
     * readable. The gate does not read "deferred", so this fails closed.
     */
    private static void deferredEpochKeyFailsClosed() {
        Map<String, Object> status = new HashMap<>();
        status.put("ready", false);
        status.put("inProgress", false);
        status.put("deferred", true);
        status.put("error", "epoch-key-pending");
        expect("deferred epoch-key-pending fails closed",
                VaultMigrationGate.decide(status), VaultMigrationGate.Decision.FAILED);
    }

    private static void inProgressErrorIsRetry() {
        Map<String, Object> status = new HashMap<>();
        status.put("ready", false);
        status.put("inProgress", true);
        status.put("error", "still copying");
        expect("error during copy retries", VaultMigrationGate.decide(status), VaultMigrationGate.Decision.RETRY);
    }

    private static void jsonNumberReady() {
        Map<String, Object> status = new HashMap<>();
        status.put("ready", true);
        status.put("migratedToSchema", 2.0d);
        expect("JSON double 2.0 ready", VaultMigrationGate.decide(status), VaultMigrationGate.Decision.READY);
    }

    private static void nullIsRetry() {
        expect("null status retries", VaultMigrationGate.decide(null), VaultMigrationGate.Decision.RETRY);
    }

    private static void timeoutAfterSixtySeconds() {
        expect("59s still waiting", VaultMigrationGate.timedOut(59_000L), false);
        expect("60s still waiting", VaultMigrationGate.timedOut(60_000L), false);
        expect("60s+1 timed out", VaultMigrationGate.timedOut(60_001L), true);
    }

    private static void expect(String label, Object got, Object want) {
        if (got == null ? want != null : !got.equals(want)) {
            failures++;
            System.err.println("FAIL " + label + ": got " + got + ", want " + want);
        }
    }
}
