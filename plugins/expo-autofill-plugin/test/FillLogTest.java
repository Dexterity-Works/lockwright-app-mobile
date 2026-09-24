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
        oversizeReplyIsDrainedNotHeld();
        splitMultibyteCharStillJoins();
        junkAfterReplyIsBroken();
        failureLineKeepsLengthAndDropsPassword();
        redactDropsPasswordThatContainsBrace();
        errorLineDropsThrowableMessage();
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

    /**
     * #20: stopping mid-frame left the rest of the reply in the pipe for
     * the next command. Past the cap, read to the end and hold nothing.
     */
    private static void oversizeReplyIsDrainedNotHeld() {
        FillLog.Assembly assembly = new FillLog.Assembly(8);
        expect("open frame", assembly.add(bytes("{\"data\":\"")), false);
        expect("still open past the cap", assembly.add(bytes("0123456789")), false);
        expect("over the cap", assembly.tooLarge(), true);
        expect("nothing held past the cap", assembly.text(), "");
        expect("frame closes after the drain", assembly.add(bytes("\"}")), true);
        expect("counts every byte", assembly.bytes() == 21, true);
    }

    private static void splitMultibyteCharStillJoins() {
        String full = "{\"n\":\"caf\u00e9 \\\"}\"}";
        byte[] raw = bytes(full);
        int cut = full.indexOf('\u00e9') + 1;
        byte[] first = new byte[cut];
        byte[] rest = new byte[raw.length - cut];
        System.arraycopy(raw, 0, first, 0, cut);
        System.arraycopy(raw, cut, rest, 0, rest.length);
        FillLog.Assembly assembly = new FillLog.Assembly();
        expect("half a UTF-8 char is not the end", assembly.add(first), false);
        expect("escaped quote and brace stay in the string", assembly.add(rest), true);
        expect("joined text", assembly.text(), full);
    }

    private static void junkAfterReplyIsBroken() {
        FillLog.Assembly assembly = new FillLog.Assembly();
        expect("junk after the value is not a reply", assembly.add(bytes("{} x")), false);
        expect("junk after the value is broken", assembly.broken(), true);
    }

    private static byte[] bytes(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
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

    /**
     * #19: org.json puts the parsed text in its message ("... of {...}").
     * A release error line names the throwable, never its message.
     */
    private static void errorLineDropsThrowableMessage() {
        Exception parse = new Exception(
                "Unterminated object at character 9 of {\"note\":\"hunter2\",\"privateKey\":\"BEGINKEY");
        String line = FillLog.errorLine("Failed to read pending jobs", new RuntimeException(parse));
        if (line.contains("hunter2") || line.contains("BEGINKEY")) {
            System.err.println("error line contains vault text: " + line);
            failures++;
        }
        expect("error line keeps message and throwable type",
                line, "Failed to read pending jobs (RuntimeException)");
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
