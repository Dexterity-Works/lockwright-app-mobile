package com.pears.pass.autofill.utils;

/**
 * Unlock-to-fill must sit over the browser. A non-floating window
 * hides Vivaldi (the page vanishes, then Vivaldi sits minimized
 * under Lockwright). Dedicated .autofill affinity keeps fill off
 * the main app task.
 */
public final class AutofillFillWindowTest {
    private static int failures = 0;

    public static void main(String[] args) {
        emptyAffinityStaysOffAppTask();
        namedAffinityJoinsAppTask();
        fillAffinityStaysOffAppTask();
        floatingKeepsCallerSurface();
        nonFloatingHidesCallerSurface();
        sheetHeightLeavesCallerVisible();
        overlayFillsWidthAtBottom();
        keyboardConfigKeepsHost();

        if (failures > 0) {
            System.err.println(failures + " AutofillFillWindow checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void emptyAffinityStaysOffAppTask() {
        expect("empty affinity does not join app task",
                AutofillFillWindow.joinsAppTask("", "works.dexterity.lockwright"), false);
    }

    private static void namedAffinityJoinsAppTask() {
        expect("package affinity joins app task",
                AutofillFillWindow.joinsAppTask(
                        "works.dexterity.lockwright", "works.dexterity.lockwright"),
                true);
        expect("null affinity joins app task",
                AutofillFillWindow.joinsAppTask(null, "works.dexterity.lockwright"), true);
    }

    private static void fillAffinityStaysOffAppTask() {
        expect(
                "fill affinity is package.autofill",
                AutofillFillWindow.fillTaskAffinity("works.dexterity.lockwright"),
                "works.dexterity.lockwright.autofill");
        expect(
                "relative .autofill does not join the app task",
                AutofillFillWindow.joinsAppTask(".autofill", "works.dexterity.lockwright"),
                false);
        expect(
                "package.autofill does not join the app task",
                AutofillFillWindow.joinsAppTask(
                        AutofillFillWindow.fillTaskAffinity("works.dexterity.lockwright"),
                        "works.dexterity.lockwright"),
                false);
    }

    private static void floatingKeepsCallerSurface() {
        expect("floating window keeps Vivaldi visible",
                AutofillFillWindow.hidesCallerSurface(true), false);
    }

    private static void nonFloatingHidesCallerSurface() {
        expect("non-floating window hides Vivaldi",
                AutofillFillWindow.hidesCallerSurface(false), true);
    }

    private static void sheetHeightLeavesCallerVisible() {
        expect("580 of 1000 leaves a top band of the caller",
                AutofillFillWindow.overlayHeightPx(1000), 580);
        expect("zero screen", AutofillFillWindow.overlayHeightPx(0), 0);
    }

    private static void overlayFillsWidthAtBottom() {
        expect("fill overlay is MATCH_PARENT wide",
                AutofillFillWindow.overlayWidth(), -1);
        expect("fill overlay sits at the bottom and fills width",
                AutofillFillWindow.overlayGravity(), 0x50 | 0x07);
    }

    private static void keyboardConfigKeepsHost() {
        expect("missing keyboard config recreates the fill host",
                AutofillFillWindow.typingRecreatesHost(null), true);
        expect("keyboard in configChanges keeps the fill host",
                AutofillFillWindow.typingRecreatesHost(
                        "keyboard|keyboardHidden|orientation|screenSize"),
                false);
    }

    private static void expect(String label, Object got, Object want) {
        if (got == null ? want != null : !got.equals(want)) {
            failures++;
            System.err.println("FAIL " + label + ": got " + got + ", want " + want);
        }
    }
}
