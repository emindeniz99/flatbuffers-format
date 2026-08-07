package io.github.emindeniz99.intellij

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.file.Path

/**
 * The resolution order, pinned.
 *
 * This is the test [EngineEnvironment] exists for. The order is four
 * tiers deep, each tier is a different *kind* of engine, and getting it
 * wrong is invisible: every wrong order still formats correctly on the
 * machine of whoever changed it, because they have all four tiers
 * installed. The only symptom in the field is a user on a stale cached
 * binary, or — worse — a modern-JS bundle handed to an ancient Node,
 * which surfaces as a syntax error in a file the user did not write.
 *
 * Every test here drives [EngineResolver] through a fake environment:
 * no IDE, no filesystem, no `node`.
 */
class EngineResolverTest {

    /** Records what was asked, so "never even looked" is assertable. */
    private class FakeEnvironment(
        var configured: String? = null,
        var executables: Set<String> = emptySet(),
        var onPath: String? = null,
        var script: Path? = null,
        var node: NodeLookup = NodeLookup.Missing,
        var native: String? = null,
        var floor: Int = 20,
    ) : EngineEnvironment {
        var nodeLookups = 0
            private set

        override fun configuredCli(): String? = configured
        override fun isExecutableFile(path: String): Boolean = path in executables
        override fun cliOnPath(): String? = onPath
        override fun bundledScript(): Path? = script
        override fun locateNode(): NodeLookup {
            nodeLookups++
            return node
        }

        override fun cachedNativeBinary(): String? = native
        override fun requiredNodeMajor(): Int = floor
    }

    private val bundle: Path = Path.of("/ide/system/flatbuffers-format/engine-js-abc/flatbuffers-format.cjs")

    @Test
    fun configuredPathWinsOverEveryOtherTier() {
        val env = FakeEnvironment(
            configured = "/opt/mine/flatbuffers-format",
            executables = setOf("/opt/mine/flatbuffers-format"),
            onPath = "/usr/local/bin/flatbuffers-format",
            script = bundle,
            node = NodeLookup.Usable("/usr/bin/node", "v22.16.0", "PATH"),
            native = "/ide/system/flatbuffers-format/engine-0.2.0/bin",
        )

        val engine = EngineResolver.resolve(env).engine

        assertEquals(CliEngine("/opt/mine/flatbuffers-format", "configured binary path"), engine)
    }

    @Test
    fun aBrokenConfiguredPathFailsClosedInsteadOfSilentlyUsingAnotherEngine() {
        // The user typed a path. Formatting with something else behind
        // their back would produce output they did not ask for, from an
        // engine version they did not choose.
        val env = FakeEnvironment(
            configured = "/opt/mine/flatbuffers-format",
            executables = emptySet(),
            onPath = "/usr/local/bin/flatbuffers-format",
            native = "/ide/system/flatbuffers-format/engine-0.2.0/bin",
        )

        val resolution = EngineResolver.resolve(env)

        assertNull("a broken configured path must not fall through", resolution.engine)
        assertEquals(EngineIssue.Kind.NO_ENGINE, resolution.issue?.kind)
        assertTrue(
            "the message must name the path the user typed",
            resolution.issue!!.message.contains("/opt/mine/flatbuffers-format"),
        )
    }

    @Test
    fun cliOnPathBeatsTheBundledJsEngineAndTheNativeCache() {
        val env = FakeEnvironment(
            onPath = "/usr/local/bin/flatbuffers-format",
            script = bundle,
            node = NodeLookup.Usable("/usr/bin/node", "v22.16.0", "PATH"),
            native = "/ide/system/flatbuffers-format/engine-0.2.0/bin",
        )

        val resolution = EngineResolver.resolve(env)

        assertEquals(CliEngine("/usr/local/bin/flatbuffers-format", "flatbuffers-format on PATH"), resolution.engine)
        assertNull(resolution.issue)
        assertEquals("must not pay for a node probe it cannot need", 0, env.nodeLookups)
    }

    @Test
    fun theBundledJsEngineBeatsThePreviouslyDownloadedNativeBinary() {
        // The pinned part of the swap: the cached native binary is
        // frozen at whatever engine version was current when it was
        // downloaded; the in-jar bundle ships with the plugin.
        val env = FakeEnvironment(
            script = bundle,
            node = NodeLookup.Usable("/Users/dev/.nvm/versions/node/v22.16.0/bin/node", "v22.16.0", "nvm v22.16.0"),
            native = "/ide/system/flatbuffers-format/engine-0.2.0/bin",
        )

        val resolution = EngineResolver.resolve(env)

        assertEquals(
            NodeJsEngine(
                "/Users/dev/.nvm/versions/node/v22.16.0/bin/node",
                bundle,
                "v22.16.0",
                "nvm v22.16.0",
            ),
            resolution.engine,
        )
        assertNull(resolution.issue)
    }

    @Test
    fun theBundledJsEngineIsSpawnedAsNodePlusScript() {
        // Why FlatBuffersEngine is a sum type at all: this tier has no
        // executable path of its own.
        val engine = NodeJsEngine("/usr/bin/node", bundle, "v22.16.0", "PATH")

        assertEquals(listOf("/usr/bin/node", bundle.toString()), engine.commandPrefix())
    }

    @Test
    fun aTooOldNodeIsRejectedAndTheNativeBinaryIsUsedInstead() {
        // The regression this whole tier is guarding: running a
        // `--target=node20` bundle on Node 10 does not fail politely,
        // it prints a syntax error into the user's face.
        val env = FakeEnvironment(
            script = bundle,
            node = NodeLookup.TooOld("/usr/bin/node", "v10.24.1", "PATH"),
            native = "/ide/system/flatbuffers-format/engine-0.2.0/bin",
            floor = 20,
        )

        val resolution = EngineResolver.resolve(env)

        assertEquals(
            CliEngine("/ide/system/flatbuffers-format/engine-0.2.0/bin", "downloaded native engine"),
            resolution.engine,
        )
        val issue = resolution.issue!!
        assertEquals(EngineIssue.Kind.NODE_TOO_OLD, issue.kind)
        assertTrue("must name the version found: ${issue.message}", issue.message.contains("v10.24.1"))
        assertTrue("must name the required floor: ${issue.message}", issue.message.contains("20"))
        assertTrue(
            "must say which engine ran instead: ${issue.message}",
            issue.message.contains("/ide/system/flatbuffers-format/engine-0.2.0/bin"),
        )
    }

    @Test
    fun aTooOldNodeWithNoFallbackLeavesNoEngineAndStillSaysWhy() {
        val env = FakeEnvironment(
            script = bundle,
            node = NodeLookup.TooOld("/usr/bin/node", "v10.24.1", "PATH"),
            native = null,
            floor = 20,
        )

        val resolution = EngineResolver.resolve(env)

        assertNull(resolution.engine)
        assertEquals(EngineIssue.Kind.NODE_TOO_OLD, resolution.issue?.kind)
        assertTrue(resolution.issue!!.message.contains("formatting cannot run"))
    }

    @Test
    fun noNodeAtAllReportsNodeMissingAndFallsBackToTheNativeBinary() {
        val env = FakeEnvironment(
            script = bundle,
            node = NodeLookup.Missing,
            native = "/ide/system/flatbuffers-format/engine-0.2.0/bin",
        )

        val resolution = EngineResolver.resolve(env)

        assertEquals(
            CliEngine("/ide/system/flatbuffers-format/engine-0.2.0/bin", "downloaded native engine"),
            resolution.engine,
        )
        assertEquals(EngineIssue.Kind.NODE_MISSING, resolution.issue?.kind)
    }

    @Test
    fun aBuildWithoutABundleQuietlyUsesTheNativeBinary() {
        // Not a degradation the user can act on — nothing on their
        // machine is wrong — so it must not raise a notification.
        val env = FakeEnvironment(
            script = null,
            native = "/ide/system/flatbuffers-format/engine-0.2.0/bin",
        )

        val resolution = EngineResolver.resolve(env)

        assertEquals(
            CliEngine("/ide/system/flatbuffers-format/engine-0.2.0/bin", "downloaded native engine"),
            resolution.engine,
        )
        assertNull(resolution.issue)
        assertEquals("no bundle means no reason to look for node", 0, env.nodeLookups)
    }

    @Test
    fun anEmptyMachineReportsNoEngineAtAll() {
        val resolution = EngineResolver.resolve(FakeEnvironment())

        assertNull(resolution.engine)
        assertEquals(EngineIssue.Kind.NO_ENGINE, resolution.issue?.kind)
    }

    @Test
    fun everyDegradationCarriesAnIssueAndEverySuccessCarriesNone() {
        // Guards the invariant the notification layer relies on: an
        // engine that is not the one we would have picked always
        // explains itself, exactly once per resolution.
        val degraded = listOf(
            FakeEnvironment(script = bundle, node = NodeLookup.Missing, native = "/native"),
            FakeEnvironment(script = bundle, node = NodeLookup.TooOld("/n", "v8.17.0", "PATH"), native = "/native"),
            FakeEnvironment(),
        )
        for (env in degraded) {
            assertTrue(
                "expected an issue for $env",
                EngineResolver.resolve(env).issue != null,
            )
        }

        val healthy = listOf(
            FakeEnvironment(configured = "/bin/fb", executables = setOf("/bin/fb")),
            FakeEnvironment(onPath = "/bin/fb"),
            FakeEnvironment(script = bundle, node = NodeLookup.Usable("/n", "v22.16.0", "PATH")),
            FakeEnvironment(native = "/native"),
        )
        for (env in healthy) {
            assertNull("expected no issue for $env", EngineResolver.resolve(env).issue)
        }
    }
}
