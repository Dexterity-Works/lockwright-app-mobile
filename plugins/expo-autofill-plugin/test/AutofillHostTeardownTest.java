package com.pears.pass.autofill.utils;

/**
 * Real check: fingerprint pauses the fill host. The worklet must stay
 * until the activity is finishing so Unlock to fill can keep the sheet.
 */
public final class AutofillHostTeardownTest {
    private static int failures = 0;

    public static void main(String[] args) {
        pauseFromBiometricKeepsWorklet();
        finishingReleasesWorklet();
        goneHostSkipsSheetUpdate();
        liveHostAppliesSheetUpdate();

        if (failures > 0) {
            System.err.println(failures + " AutofillHostTeardown checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void pauseFromBiometricKeepsWorklet() {
        expect("pause is not finishing", AutofillHostTeardown.shouldReleaseWorklet(false), false);
    }

    private static void finishingReleasesWorklet() {
        expect("finishing releases", AutofillHostTeardown.shouldReleaseWorklet(true), true);
    }

    private static void goneHostSkipsSheetUpdate() {
        expect("detached skips", AutofillHostTeardown.shouldApplySheetUpdate(false, false), false);
        expect("finishing skips", AutofillHostTeardown.shouldApplySheetUpdate(true, true), false);
    }

    private static void liveHostAppliesSheetUpdate() {
        expect("live applies", AutofillHostTeardown.shouldApplySheetUpdate(true, false), true);
    }

    private static void expect(String label, boolean got, boolean want) {
        if (got != want) {
            failures++;
            System.err.println("FAIL " + label + ": got " + got + ", want " + want);
        }
    }
}
