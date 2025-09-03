plugins { `java-library` }

java { toolchain { languageVersion.set(JavaLanguageVersion.of(21)) } }

repositories { mavenCentral() }

dependencies {
    implementation("software.amazon.smithy:smithy-build:1.56.0")
    implementation("software.amazon.smithy:smithy-model:1.56.0")
    implementation("software.amazon.smithy:smithy-utils:1.56.0")
    implementation("software.amazon.smithy:smithy-codegen-core:1.56.0")

    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}
