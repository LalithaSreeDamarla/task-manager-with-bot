// 🔝 imports must be first
import org.gradle.api.tasks.Copy
import java.io.File

description = "Smithy definition of a Cafe service."

plugins {
    `java-library`
    id("software.amazon.smithy.gradle.smithy-jar")
}

repositories { mavenCentral() }

dependencies {
    val smithyVersion: String by project
    implementation("software.amazon.smithy:smithy-model:$smithyVersion")
    implementation("software.amazon.smithy:smithy-aws-traits:$smithyVersion")
    implementation("software.amazon.smithy:smithy-validation-model:$smithyVersion")
    implementation("software.amazon.smithy.typescript:smithy-aws-typescript-codegen:0.22.0")
    implementation("software.amazon.smithy:smithy-openapi:$smithyVersion")
}

// Helps the Smithy IntelliJ plugin identify models
sourceSets {
    main {
        java { srcDir("model") }
    }
}

// ---- Export generated outputs to top-level /generated ----
val repoRoot = layout.projectDirectory.asFile.parentFile

tasks.register<Copy>("exportClient") {
    dependsOn("smithyBuild")
    from(layout.buildDirectory.dir("smithyprojections/smithy/ts-client"))
    into(File(repoRoot, "generated/client-sdk"))
}

tasks.register<Copy>("exportServer") {
    dependsOn("smithyBuild")
    from(layout.buildDirectory.dir("smithyprojections/smithy/ts-ssdk"))
    into(File(repoRoot, "generated/server-sdk"))
}

tasks.register<Copy>("exportOpenapi") {
    dependsOn("smithyBuild")
    from(layout.buildDirectory.dir("smithyprojections/smithy/openapi"))
    into(File(repoRoot, "generated/openapi"))
}

tasks.register("exportGenerated") {
    dependsOn("exportClient", "exportServer", "exportOpenapi")
}
