package com.pears.pass.autofill.utils;

import java.nio.charset.StandardCharsets;

/**
 * Real check: a vault-list reply bigger than one IPC read must be joined
 * before it is parsed, and the failure line must not contain the password.
 * A 64MB worklet limit is what aborted the list.
 */
public final class FillLogTest {
    private static int failures = 0;

    public static void main(String[] args) {
        truncatedChunkIsNotAReply();
        chunksJoinIntoOneReply();
        failureLineKeepsLengthAndDropsPassword();
        redactDropsPasswordThatContainsBrace();
        workletMemoryClearsThe64MbAbort();

        if (failures > 0) {
            System.err.println(failures + " FillLog checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void truncatedChunkIsNotAReply() {
        String full = "{\"data\":[{\"password\":\"a}bsecret\"}]}";
        String chunk = full.substring(0, 20);
        expect("cut reply is not complete", FillLog.isComplete(chunk), false);
    }

    private static void chunksJoinIntoOneReply() {
        String full = "{\"data\":[{\"password\":\"a}bsecret\"}]}";
        byte[] raw = full.getBytes(StandardCharsets.UTF_8);
        int cut = 20;
        byte[] first = new byte[cut];
        byte[] rest = new byte[raw.length - cut];
        System.arraycopy(raw, 0, first, 0, cut);
        System.arraycopy(raw, cut, rest, 0, rest.length);

        FillLog.Assembly assembly = new FillLog.Assembly();
        expect("first IPC read is not the reply", assembly.add(first), false);
        expect("later IPC read finishes the reply", assembly.add(rest), true);
        expect("joined text", assembly.text(), full);
    }

    private static void failureLineKeepsLengthAndDropsPassword() {
        String chunk = "{\"data\":[{\"id\":\"1\",\"password\":\"a}bsecret\",\"note\":\"x\"}";
        String line = FillLog.parseFailure(16, chunk);
        if (!line.contains("command=16") || !line.contains("bytes=" + chunk.length())
                || !line.contains("incomplete")) {
            System.err.println("failure line missing length: " + line);
            failures++;
        }
        if (line.contains("a}bsecret") || line.contains("\"x\"")) {
            System.err.println("failure line contains vault text: " + line);
            failures++;
        }
    }

    private static void redactDropsPasswordThatContainsBrace() {
        String leaked = "{\"password\":\"a}bsecret\",\"_privateKeyBuffer\":\"BEGINKEY\"}";
        String out = FillLog.redact(leaked);
        if (out.contains("a}bsecret") || out.contains("BEGINKEY")) {
            System.err.println("redact left a secret: " + out);
            failures++;
        }
        String plain = FillLog.redact("password=a}bsecret");
        if (plain.contains("a}bsecret")) {
            System.err.println("redact left an unquoted secret: " + plain);
            failures++;
        }
    }

    private static void workletMemoryClearsThe64MbAbort() {
        if (FillLog.WORKLET_MEMORY_MB <= 64) {
            System.err.println("worklet memory is still " + FillLog.WORKLET_MEMORY_MB + "MB");
            failures++;
        }
    }

    private static void expect(String label, boolean got, boolean want) {
        if (got != want) {
            System.err.println(label + " is " + got + ", expected " + want);
            failures++;
        }
    }

    private static void expect(String label, String got, String want) {
        if (got == null || !got.equals(want)) {
            System.err.println(label + " is " + got + ", expected " + want);
            failures++;
        }
    }
}
