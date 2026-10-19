// IntelliJ Platform Gradle Plugin v2 (`org.jetbrains.intellij.platform`).
//
// Why v2 and not the legacy v1 `gradle-intellij-plugin`: v1 went into
// maintenance mode in 2024; v2 is the supported toolchain for IntelliJ
// 2024.2+, has first-class support for Marketplace publishing via
// `signPlugin`/`publishPlugin`, and uses the new IntelliJ Platform
// Repository (cuts download size dramatically vs. v1's bundled IDE).
//
// Build entry points:
//   * `./gradlew buildPlugin` — produces a .zip in build/distributions/
//     that can be installed via Marketplace OR `Settings → Plugins →
//     Install from disk`.
//   * `./gradlew runIde` — boots a sandbox IDE with the plugin loaded.
//     First run downloads the IDE distribution (~700 MB) and caches it
//     under `~/.gradle/caches/modules-2/files-2.1/com.jetbrains.intellij.idea/`.
//   * `./gradlew verifyPlugin` — Marketplace pre-flight validation. CI
//     runs this on every PR; if it fails the plugin will be rejected at
//     upload time anyway.
//   * `./gradlew publishPlugin` — uploads to Marketplace; needs the
//     `JETBRAINS_MARKETPLACE_TOKEN` env var. The release workflow wires
//     this up automatically.

import java.io.File
import org.jetbrains.changelog.markdownToHTML
import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType
import org.jetbrains.intellij.platform.gradle.TestFrameworkType

plugins {
    java
    kotlin("jvm") version "2.4.10"
    id("org.jetbrains.intellij.platform") version "2.16.0"
    // Only for its Markdown → HTML renderer (`markdownToHTML`), used for
    // the change notes below. Its own CHANGELOG tasks are not used:
    // release-please writes the changelogs.
    id("org.jetbrains.changelog") version "2.5.0"
}

group = providers.gradleProperty("pluginGroup").get()
version = providers.gradleProperty("pluginVersion").get()

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        val type = providers.gradleProperty("platformType")
        val ver = providers.gradleProperty("platformVersion")
        create(type, ver)

        // No bundled-plugin dependencies needed for v0.1. If we later add
        // (e.g.) a TextMate-bundle-based highlighter, append:
        //   bundledPlugin("org.jetbrains.plugins.textmate")
        // and mirror it in plugin.xml `<depends>`.

        // instrumentationTools() dropped: removed in IntelliJ Platform
        // Gradle Plugin 2.12+ — the Java compiler dep is now auto-applied.
        pluginVerifier()
        zipSigner()
        testFramework(TestFrameworkType.Platform)
    }

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.opentest4j:opentest4j:1.3.0")
}

tasks.wrapper {
    // CI generates the wrapper instead of checking in gradle-wrapper.jar;
    // the version comes from gradle.properties so no workflow repeats it.
    gradleVersion = providers.gradleProperty("gradleVersion").get()
}

// ---- generated engine coordinates -------------------------------------
// The plugin downloads the engine binary from the GitHub Release tagged
// `flatbuffers-format-v<version>`. Both halves of that URL are generated
// rather than hand-copied into Kotlin: the version is read from the
// engine's own package.json (the single source release-please maintains),
// and the repository comes from gradle.properties. A hand-maintained copy
// would drift on any engine release and silently 404 for every user.
val generateEngineVersion = tasks.register("generateEngineVersion") {
    val enginePackageJson = layout.projectDirectory.file("../flatbuffers-formatter/package.json")
    val releaseRepo = providers.gradleProperty("pluginRepository")
    val outDir = layout.buildDirectory.dir("generated/engine-coordinates")
    inputs.file(enginePackageJson)
    inputs.property("releaseRepo", releaseRepo)
    outputs.dir(outDir)
    doLast {
        val pkg = enginePackageJson.asFile
        @Suppress("UNCHECKED_CAST")
        val parsed = groovy.json.JsonSlurper().parse(pkg) as Map<String, Any?>
        val version = parsed["version"] as? String
            ?: error("no top-level \"version\" in $pkg")
        // The Node floor the bundled JS engine must not be run below.
        // Generated for the same reason as the version: a literal `20`
        // in Kotlin would keep claiming 20 after the engine raised its
        // own `engines.node`, and the plugin would hand a modern-JS
        // bundle to a Node that can't parse it.
        @Suppress("UNCHECKED_CAST")
        val engines = parsed["engines"] as? Map<String, Any?>
        val nodeRange = engines?.get("node") as? String
            ?: error("no \"engines.node\" in $pkg")
        val nodeFloor = Regex("""(\d+)""").find(nodeRange)?.groupValues?.get(1)
            ?: error("cannot derive a Node major floor from engines.node = \"$nodeRange\" in $pkg")
        val target = outDir.get().file("io/github/emindeniz99/intellij/EngineCoordinates.kt").asFile
        target.parentFile.mkdirs()
        target.writeText(
            """
            // GENERATED by the `generateEngineVersion` Gradle task — do not edit.
            // Sources: ../flatbuffers-formatter/package.json, gradle.properties.
            package io.github.emindeniz99.intellij

            internal const val GENERATED_ENGINE_VERSION: String = "$version"
            internal const val GENERATED_RELEASE_REPO: String = "${releaseRepo.get()}"
            internal const val GENERATED_NODE_MAJOR_FLOOR: Int = $nodeFloor

            """.trimIndent() + "\n",
        )
    }
}

// ---- generated engine JS bundle ---------------------------------------
// The formatter itself is a ~620 KiB JavaScript bundle. The native
// binary the plugin can download is that same bundle glued to an
// embedded Node runtime — 105 MiB, of which 99.4% is runtime. So we
// ship the bundle in the plugin .zip and run it on whatever Node the
// user already has; the native download stays as the no-Node fallback.
//
// Same generated-input pattern as `generateEngineVersion` above, but
// into `resources` instead of `kotlin`, so the file lands in the plugin
// jar at `/engine/flatbuffers-format.cjs`. It is written under build/
// and therefore gitignored — never committed.
//
// Prerequisites are node on PATH plus a built engine
// (`pnpm --filter flatbuffers-format build`). When either is missing,
// what happens depends on whether this build can SHIP:
//
//   * A release invocation (`publishPlugin`/`signPlugin`, or an
//     explicit `-PrequireEngineBundle=true`) FAILS. A published plugin
//     with no bundle silently loses its Node tier and forces every user
//     into the 105 MiB native download — a regression nobody would
//     notice from a green build log, which is precisely why it must not
//     be a warning.
//   * Any other invocation warns and skips, because
//     intellij-flatbuffers.yml is a Gradle-only job with no pnpm step
//     and a hard failure there would turn every PR red without giving
//     anyone a way to fix it. Adding a node + `pnpm install && pnpm
//     --filter flatbuffers-format build` step to that workflow (and
//     passing -PrequireEngineBundle=true) is the real fix.
val BUNDLE_MISSING_CONSEQUENCE =
    "The plugin would ship WITHOUT its bundled JS engine, so every user falls back to the " +
        "105 MiB native download."

val engineBundleIsMandatory: Boolean = run {
    val releaseTasks = setOf("publishPlugin", "signPlugin")
    val isReleaseInvocation = gradle.startParameter.taskNames.any { requested ->
        releaseTasks.any { requested == it || requested.endsWith(":$it") }
    }
    providers.gradleProperty("requireEngineBundle")
        .map { it.toBoolean() }
        .getOrElse(isReleaseInvocation)
}
/** First `node` executable on the build machine's PATH, or null. */
fun nodeOnPath(): File? {
    val isWindows = System.getProperty("os.name").lowercase().contains("win")
    val names = if (isWindows) listOf("node.exe", "node.cmd") else listOf("node")
    return (System.getenv("PATH") ?: "")
        .split(File.pathSeparator)
        .asSequence()
        .filter { it.isNotBlank() }
        .flatMap { dir -> names.asSequence().map { File(dir, it) } }
        .firstOrNull { it.isFile && it.canExecute() }
}

val engineJsDir = layout.buildDirectory.dir("generated/engine-js")
val bundleEngineJs = tasks.register<Exec>("bundleEngineJs") {
    val bundler = file("../flatbuffers-formatter/scripts/build-bundle.mjs")
    val engineDist = file("../flatbuffers-formatter/dist")
    val cliEntry = File(engineDist, "src/cli.js")
    val node = nodeOnPath()
    val outFile = engineJsDir.get().file("engine/flatbuffers-format.cjs").asFile

    inputs.file(bundler)
    inputs.file("../flatbuffers-formatter/package.json")
    // fileTree (not inputs.dir) tolerates a missing dist/ — the task is
    // skipped in that case, and inputs.dir would fail snapshotting first.
    inputs.files(fileTree(engineDist))
    outputs.dir(engineJsDir)

    commandLine(node?.absolutePath ?: "node", bundler.absolutePath, "--outfile", outFile.absolutePath)

    val blocker: String? = when {
        node == null -> "no `node` on the build machine's PATH"
        !cliEntry.isFile ->
            "${cliEntry.path} not found — run `pnpm --filter flatbuffers-format build` first"
        else -> null
    }
    // Fail at configuration time, not from inside `onlyIf`: Gradle wraps
    // an exception thrown by a spec in "Could not evaluate onlyIf
    // predicate", which buries the one sentence the reader needs.
    if (blocker != null && engineBundleIsMandatory) {
        throw GradleException(
            "bundleEngineJs cannot run: $blocker. $BUNDLE_MISSING_CONSEQUENCE Fix the build " +
                "environment, or pass -PrequireEngineBundle=false to deliberately build a " +
                "plugin without its JS engine.",
        )
    }
    onlyIf {
        if (blocker == null) {
            true
        } else {
            logger.warn("bundleEngineJs SKIPPED: $blocker. $BUNDLE_MISSING_CONSEQUENCE")
            false
        }
    }

    doLast {
        // esbuild can exit 0 having written nothing useful (a bad
        // --outfile path, a full disk). The jar would then be built from
        // an empty resources dir and look identical to a successful
        // build, so assert on the artefact itself. The real bundle is
        // ~620 KiB; anything under 10 KiB is not a formatter.
        val size = if (outFile.isFile) outFile.length() else 0L
        if (size < 10_000) {
            throw GradleException(
                "bundleEngineJs produced no usable bundle at ${outFile.path} ($size bytes). " +
                    "The plugin jar would ship without its JS engine.",
            )
        }
        logger.lifecycle("bundleEngineJs: ${size / 1024} KiB -> ${outFile.path}")
    }
}

sourceSets["main"].resources.srcDir(bundleEngineJs)

// ---- generated change notes -------------------------------------------
// The Marketplace's "What's New" for a version is rendered from the two
// CHANGELOG.md files release-please writes: this plugin's section for
// `pluginVersion`, then the bundled engine's section for its version (a
// formatter fix reaches plugin users through the bundle, but
// release-please files it under the engine). They used to be
// hand-written in plugin.xml, which release-please never touches, so the
// notes drifted from the version: 0.3.0 shipped showing 0.2.0's list.
//
// A missing section fails the build. release-please adds both sections
// in the same commit that bumps the versions, so a missing one means
// something is broken, and it must not ship with empty notes.
fun changelogSection(changelog: File, version: String): String {
    val lines = changelog.readLines()
    val start = lines.indexOfFirst { it.startsWith("## [$version]") }
    check(start >= 0) { "$changelog has no \"## [$version]\" section for the change notes" }
    val end = (start + 1 until lines.size).firstOrNull { lines[it].startsWith("## ") } ?: lines.size
    // Demote release-please's "### Features" one level under our headings.
    return lines.subList(start + 1, end).joinToString("\n") { it.replace(Regex("^###"), "####") }.trim()
}

fun changeNotesHtml(): String {
    val pluginVersion = providers.gradleProperty("pluginVersion").get()
    @Suppress("UNCHECKED_CAST")
    val engine = groovy.json.JsonSlurper()
        .parse(file("../flatbuffers-formatter/package.json")) as Map<String, Any?>
    val engineVersion = engine["version"] as String
    return markdownToHTML(
        "### $pluginVersion\n\n" +
            changelogSection(file("CHANGELOG.md"), pluginVersion) +
            "\n\n### Bundled formatter: flatbuffers-format $engineVersion\n\n" +
            changelogSection(file("../flatbuffers-formatter/CHANGELOG.md"), engineVersion),
    )
}

kotlin {
    jvmToolchain(providers.gradleProperty("javaVersion").get().toInt())
    sourceSets["main"].kotlin.srcDir(generateEngineVersion)
}

intellijPlatform {
    pluginConfiguration {
        version = providers.gradleProperty("pluginVersion")

        // <description> stays inline in plugin.xml. <change-notes> is
        // generated: see `changeNotesHtml` below.
        changeNotes = providers.provider { changeNotesHtml() }

        ideaVersion {
            // sinceBuild = 242.* means IntelliJ 2024.2.0 onward (and
            // every JetBrains IDE built on that platform: Rider 2024.2,
            // WebStorm 2024.2, etc.). untilBuild = null = no upper bound
            // — we'd rather get a "verify-plugin" warning when a future
            // IDE drops an API than artificially expire users.
            sinceBuild = "242"
            untilBuild = provider { null }
        }
    }

    pluginVerification {
        ides {
            // `recommended()` would auto-resolve to JetBrains'
            // current recommended-for-verification set, but that
            // list occasionally references IDE builds that aren't
            // yet downloadable from the public CDN (the indexer is
            // ahead of releases). Pinning explicit, known-shipped
            // builds is more reliable for CI.
            //
            // A three-point check across the supported range
            // (sinceBuild=242, no upper bound): the floor, the newest
            // IntelliJ, and the latest Rider. Few enough IDE downloads
            // to fit the runner disk and keep CI minutes down — the
            // floor is where breakage hides (an API newer than 242);
            // the newest is a forward sanity check.
            //
            // Type rule: IntelliJ IDEA Community (IC) only exists for
            // builds < 2025.3; 2025.3 unified IDEA into one product, so
            // the newest line uses the IntellijIdea (IU) type. Rider must
            // use the multi-OS ZIP — its installer isn't supported
            // (plugin issue #1852).
            create(IntelliJPlatformType.IntellijIdeaCommunity, "2024.2") // oldest, == sinceBuild 242
            create(IntelliJPlatformType.IntellijIdea, "2026.1")          // newest IntelliJ (post-merge unified type)
            create(IntelliJPlatformType.Rider, "2026.1") {               // latest Rider
                useInstaller = false
            }
        }
    }

    signing {
        // Marketplace signing keys come from CI env. Local builds skip
        // signing — the resulting unsigned .zip still installs via
        // "Install plugin from disk".
        certificateChainFile = providers.environmentVariable("JETBRAINS_CERTIFICATE_CHAIN")
            .map { file(it) }
            .orElse(provider { null })
        privateKeyFile = providers.environmentVariable("JETBRAINS_PRIVATE_KEY")
            .map { file(it) }
            .orElse(provider { null })
        password = providers.environmentVariable("JETBRAINS_PRIVATE_KEY_PASSWORD")
    }

    publishing {
        token = providers.environmentVariable("JETBRAINS_MARKETPLACE_TOKEN")
        // `channels = ["default"]` => public Marketplace listing.
        // Switch to ["beta"] to ship a prerelease without touching the
        // stable channel.
        channels = providers.gradleProperty("pluginVersion").map {
            listOf(if (it.contains("-")) "beta" else "default")
        }
    }
}

tasks {
    wrapper {
        gradleVersion = "9.5.1"
        distributionType = Wrapper.DistributionType.BIN
    }

    test {
        useJUnit()
    }
}
