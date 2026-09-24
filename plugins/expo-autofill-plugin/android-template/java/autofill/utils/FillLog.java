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
        // Cap 0: scan only, hold none of the text.
        return new Assembly(0).add(text.getBytes(StandardCharsets.UTF_8));
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

    /**
     * Release error line: the message and the throwable's type. Its message
     * and stack are dropped; org.json puts the parsed text in the message.
     */
    public static String errorLine(String message, Throwable tr) {
        String line = redact(message);
        if (tr == null) return line;
        return line + " (" + tr.getClass().getSimpleName() + ")";
    }

    /**
     * One IPC reply, joined across reads. Each read scans only its own
     * bytes; JSON structure is ASCII, so a UTF-8 char cut between reads
     * cannot end the value early. Past the cap the bytes are counted and
     * dropped: the frame is still read to its end so the next command
     * does not get this reply's tail.
     */
    public static final class Assembly {
        private final int maxBytes;
        private final ByteArrayOutputStream out = new ByteArrayOutputStream();
        private long total;
        private int reads;
        private int depth;
        private boolean started;
        private boolean inString;
        private boolean escape;
        private boolean closed;
        private boolean broken;

        public Assembly() {
            this(MAX_REPLY_BYTES);
        }

        Assembly(int maxBytes) {
            this.maxBytes = maxBytes;
        }

        /** True once the JSON value closes with nothing but whitespace after it. */
        public boolean add(byte[] chunk) {
            reads++;
            if (chunk != null && chunk.length > 0) {
                for (byte b : chunk) scan(b);
                total += chunk.length;
                if (total <= maxBytes) {
                    out.write(chunk, 0, chunk.length);
                } else {
                    out.reset();
                }
            }
            return closed && !broken;
        }

        private void scan(byte b) {
            if (broken) return;
            if (closed || !started) {
                if (b == ' ' || b == '\t' || b == '\n' || b == '\r') return;
                if (closed || (b != '{' && b != '[')) {
                    broken = true;
                    return;
                }
                started = true;
                depth = 1;
                return;
            }
            if (inString) {
                if (escape) escape = false;
                else if (b == '\\') escape = true;
                else if (b == '"') inString = false;
                return;
            }
            if (b == '"') inString = true;
            else if (b == '{' || b == '[') depth++;
            else if ((b == '}' || b == ']') && --depth == 0) closed = true;
        }

        /** Text of a reply within the cap; empty once it went over. */
        public String text() {
            return out.toString(StandardCharsets.UTF_8);
        }

        public int bytes() {
            return (int) Math.min(total, Integer.MAX_VALUE);
        }

        public int reads() {
            return reads;
        }

        public boolean tooLarge() {
            return total > maxBytes;
        }

        /** Not one JSON object or array: reading on will not fix it. */
        public boolean broken() {
            return broken;
        }
    }
}
