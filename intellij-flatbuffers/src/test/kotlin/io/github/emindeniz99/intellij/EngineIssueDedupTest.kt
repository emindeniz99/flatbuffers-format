package io.github.emindeniz99.intellij

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * One balloon per degradation per session — not one per format.
 *
 * Engine resolution runs on every formatting request, and with
 * *Actions on Save → Reformat code* enabled that is every ⌘S. Without
 * the dedup an old Node produces a balloon per save, which trains the
 * user to dismiss the plugin's notifications unread.
 */
class EngineIssueDedupTest {

    @Test
    fun aKindIsReportedOnceNoMatterHowManyTimesItRecurs() {
        val dedup = EngineIssueDedup()

        assertTrue(dedup.firstTime(EngineIssue.Kind.NODE_TOO_OLD))
        repeat(50) {
            assertFalse(
                "a repeat format must not re-notify",
                dedup.firstTime(EngineIssue.Kind.NODE_TOO_OLD),
            )
        }
    }

    @Test
    fun eachKindGetsItsOwnFirstChance() {
        // Dedup must be per kind: a user whose Node is too old and who
        // then uninstalls Node entirely has a different problem and
        // needs to hear about it.
        val dedup = EngineIssueDedup()

        for (kind in EngineIssue.Kind.entries) {
            assertTrue("$kind should be reportable once", dedup.firstTime(kind))
        }
        for (kind in EngineIssue.Kind.entries) {
            assertFalse("$kind should be silent the second time", dedup.firstTime(kind))
        }
    }
}
