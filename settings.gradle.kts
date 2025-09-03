pluginManagement { repositories { gradlePluginPortal(); mavenCentral() } }

rootProject.name = "task-manager-with-bot"
include(":plugins:smithy-crud-plugin")
include(":smithy-typescript-quickstart")
// (only needed if folder name differs)
// project(":smithy-typescript-quickstart").projectDir = file("smithy-typescript-quickstart")
