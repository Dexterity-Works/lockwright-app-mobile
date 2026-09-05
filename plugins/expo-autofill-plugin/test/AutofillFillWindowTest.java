package com.pears.pass.autofill.utils;

/**
 * Unlock-to-fill must sit over the browser. A non-floating window
 * hides Vivaldi (the page vanishes, then Vivaldi sits minimized
 * under Lockwright). Empty affinity keeps fill off the main app task.
 */
public final class AutofillFillWindowTest {
    private static int failures = 0;

    public static void main(String[] args) {
        emptyAffinityStaysOffAppTask();
        namedAffinityJoinsAppTask();
        floatingKeepsCallerSurface();
        nonFloatingHidesCallerSurface();
        sheetHeightIsPartial();

        if (failures > 0) {
            System.err.println(failures + " AutofillFillWindow checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void emptyAffinityStaysOffAppTask() {
        expect("empty affinity does not join app task",
                AutofillFillWindow.joinsAppTask(""), false);
    }

    private static void namedAffinityJoinsAppTask() {
        expect("package affinity joins app task",
                AutofillFillWindow.joinsAppTask("com.pears.pass"), true);
        expect("null affinity joins app task",
                AutofillFillWindow.joinsAppTask(null), true);
    }

    private static void floatingKeepsCallerSurface() {
        expect("floating window keeps Vivaldi visible",
                AutofillFillWindow.hidesCallerSurface(true), false);
    }

    private static void nonFloatingHidesCallerSurface() {
        expect("non-floating window hides Vivaldi",
                AutofillFillWindow.hidesCallerSurface(false), true);
    }

    private static void sheetHeightIsPartial() {
        expect("850 of 1000", AutofillFillWindow.overlayHeightPx(1000), 850);
        expect("zero screen", AutofillFillWindow.overlayHeightPx(0), 0);
    }

    private static void expect(String label, Object got, Object want) {
        if (got == null ? want != null : !got.equals(want)) {
            failures++;
            System.err.println("FAIL " + label + ": got " + got + ", want " + want);
        }
    }
}
