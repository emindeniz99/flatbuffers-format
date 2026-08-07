// IntelliJ Platform plugin uses the standard Gradle settings file.
// Project name doubles as the artifact name produced by `buildPlugin`
// (`build/distributions/<rootProject.name>-<version>.zip`).

// Lets Gradle download the JDK the `javaVersion` toolchain asks for instead
// of failing on a contributor whose only JDK is a different major. CI gets
// its JDK from setup-java, so this is purely for local builds.
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "intellij-flatbuffers"
