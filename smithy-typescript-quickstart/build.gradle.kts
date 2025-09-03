plugins { application }

repositories { 
    mavenCentral()
    mavenLocal()
}

dependencies {
    implementation(project(":plugins:smithy-crud-plugin"))
    implementation("software.amazon.smithy:smithy-cli:1.56.0")
    implementation("software.amazon.smithy:smithy-aws-traits:1.56.0") // <-- add
}

// Run Smithy with your plugin on the classpath
val smithy by tasks.register<JavaExec>("smithy") {
    group = "smithy"
    description = "Run smithy build with custom plugin"
    mainClass.set("software.amazon.smithy.cli.SmithyCli")
    classpath = sourceSets.main.get().runtimeClasspath
    args = listOf(
        "build",
        "--discover",
        "--output", layout.buildDirectory.dir("smithy").get().asFile.absolutePath
    )
    workingDir = project.projectDir
}

// Configure the existing clean task (DON'T register a new one)
tasks.named<Delete>("clean") {
    delete(
        "server/node_modules",
        "server/dist",
        "server/ssdk",
        "client/node_modules",
        "client/sdk"
    )
}
