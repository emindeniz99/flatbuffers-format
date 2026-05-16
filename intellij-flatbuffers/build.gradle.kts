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

import org.jetbrains.intellij.platform.gradle.TestFrameworkType

plugins {
    java
    kotlin("jvm") version "2.0.21"
    id("org.jetbrains.intellij.platform") version "2.1.0"
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

        instrumentationTools()
        pluginVerifier()
        zipSigner()
        testFramework(TestFrameworkType.Platform)
    }

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.opentest4j:opentest4j:1.3.0")
}

kotlin {
    jvmToolchain(providers.gradleProperty("javaVersion").get().toInt())
}

intellijPlatform {
    pluginConfiguration {
        version = providers.gradleProperty("pluginVersion")

        // Plugin.xml's <description> and <change-notes> can also live
        // here as Gradle properties; we keep them inline in plugin.xml
        // so README + CHANGELOG stay the single source of truth and
        // diffs are reviewable without Gradle parsing.

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
            // builds is more reliable for CI; bump in lockstep with
            // `sinceBuild`/`untilBuild` above.
            //
            // The matrix below covers the lowest supported build
            // (since we set sinceBuild=242) and the latest stable
            // line, which together catch both forward- and
            // backward-compat regressions. Rider is verified
            // explicitly because it occasionally exposes a slightly
            // different platform API surface than Community IDEA
            // (some commercial-only modules), and the plugin
            // explicitly claims to support Rider in plugin.xml's
            // description.
            ide("IC-2024.2")     // floor, matches sinceBuild
            ide("IC-2024.3")     // mid-cycle
            ide("IC-2025.1")     // recent stable
            ide("RD-2024.2")     // Rider — floor, most-common downstream
            ide("RD-2025.1")     // Rider — current
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
        gradleVersion = "8.10.2"
        distributionType = Wrapper.DistributionType.BIN
    }

    test {
        useJUnit()
    }
}
