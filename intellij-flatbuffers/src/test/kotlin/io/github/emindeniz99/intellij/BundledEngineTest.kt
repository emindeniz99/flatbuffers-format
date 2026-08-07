package io.github.emindeniz99.intellij

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pins the GitHub Release tag the "Download bundled engine" action
 * fetches from.
 *
 * Why this test exists: the URL is the plugin's only network contract
 * and nothing else exercises it — a wrong tag compiles, passes review,
 * and then 404s for every user who clicks the button. That is exactly
 * what shipped: the code built `flatbuffers-format@<version>` (npm's
 * spec syntax), while release-please tags this repo
 * `<component>-v<version>`.
 */
class BundledEngineTest {
    private val downloadPrefix =
        "https://github.com/$GENERATED_RELEASE_REPO/releases/download/"

    /** The tag segment of the download base, i.e. what must exist on GitHub. */
    private val tag: String
        get() = BundledEngine.RELEASE_BASE.removePrefix(downloadPrefix)

    @Test
    fun downloadsFromTheConfiguredRepositoryReleaseAssets() {
        assertTrue(
            "expected a GitHub release-asset URL under $downloadPrefix, " +
                "got ${BundledEngine.RELEASE_BASE}",
            BundledEngine.RELEASE_BASE.startsWith(downloadPrefix),
        )
    }

    @Test
    fun tagFollowsTheReleasePleaseComponentVersionConvention() {
        // release-please's tag pattern for this monorepo: `<component>-v<version>`
        // (live proof: flatbuffers-format-v0.2.0, intellij-flatbuffers-v0.2.0).
        // Notably NOT `<component>@<version>` — no such tag has ever existed.
        val releasePleaseTag = Regex("""^flatbuffers-format-v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$""")
        assertTrue(
            "release tag '$tag' does not match release-please's " +
                "<component>-v<version> convention — the download would 404",
            releasePleaseTag.matches(tag),
        )
    }

    @Test
    fun tagCarriesTheEngineVersionThePluginTargets() {
        assertEquals(
            "the release tag must name the engine version generated from " +
                "flatbuffers-formatter/package.json",
            "flatbuffers-format-v${BundledEngine.ENGINE_VERSION}",
            tag,
        )
    }
}
