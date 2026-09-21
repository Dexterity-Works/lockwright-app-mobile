package com.pears.pass.autofill.utils;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Unlock-to-fill IPC replies and the release error line.
 * One read is not a reply: the pipe delivers about 64KB and the
 * rest follows. The error line is the length and the reason.
 */
public final class FillLog {
    /**
     * ponytail: 64MB aborted at about 55MB of live heap while listing
     * passkey records. 256MB leaves room for the stringify copy.
     * Drop this when the list omits private-key blobs.
     */
    public static final int WORKLET_MEMORY_MB = 256;

    /** Stop assembling a reply that will not fit the sheet. */
    public static final int MAX_REPLY_BYTES = 32 * 1024 * 1024;

    private FillLog() {}

    public static boolean isComplete(String text) {
        if (text == null || text.isEmpty()) return false;
        int i = 0;
        int n = text.length();
        while (i < n && Character.isWhitespace(text.charAt(i))) i++;
        if (i >= n) return false;
        char start = text.charAt(i);
        if (start != '{' && start != '[') return false;
        int depth = 0;
        boolean inString = false;
        boolean escape = false;
        for (; i < n; i++) {
            char c = text.charAt(i);
            if (inString) {
                if (escape) {
                    escape = false;
                    continue;
                }
                if (c == '\\') {
                    escape = true;
                    continue;
                }
                if (c == '"') inString = false;
                continue;
            }
            if (c == '"') {
                inString = true;
                continue;
            }
            if (c == '{' || c == '[') depth++;
            else if (c == '}' || c == ']') {
                depth--;
                if (depth == 0) {
                    i++;
                    while (i < n && Character.isWhitespace(text.charAt(i))) i++;
                    return i == n;
                }
                if (depth < 0) return false;
            }
        }
        return false;
    }

    public static String diagnostic(int command, int bytes, int reads, String reason) {
        return "ipc command=" + command
                + " bytes=" + bytes
                + " reads=" + reads
                + " " + reason;
    }

    /** Parse failure for a reply. The text of the reply is not in the result. */
    public static String parseFailure(int command, String reply) {
        int bytes = reply == null ? 0 : reply.length();
        String reason = isComplete(reply) ? "parse" : "incomplete";
        return diagnostic(command, bytes, 1, reason);
    }

    /**
     * Quoted secret fields, including a value that contains `}`.
     * The old character class stopped at `}` and left the rest of the password.
     */
    public static String redact(String message) {
        if (message == null) return null;
        String quoted = message.replaceAll(
                "(?i)\"(password|_privateKeyBuffer|privateKey|credential|token|secret)\"\\s*:\\s*\"(?:\\\\.|[^\"\\\\])*\"",
                "\"$1\":\"***\"");
        return quoted.replaceAll(
                "(?i)(password|token|credential|secret)[\"']?\\s*[:=]\\s*\\S+",
                "$1=***");
    }

    public static final class Assembly {
        private final ByteArrayOutputStream out = new ByteArrayOutputStream();
        private int reads;

        public boolean add(byte[] chunk) {
            if (chunk != null && chunk.length > 0) {
                out.write(chunk, 0, chunk.length);
            }
            reads++;
            return isComplete(text());
        }

        public String text() {
            return out.toString(StandardCharsets.UTF_8);
        }

        public int bytes() {
            return out.size();
        }

        public int reads() {
            return reads;
        }

        public boolean tooLarge() {
            return out.size() > MAX_REPLY_BYTES;
        }
    }
}
