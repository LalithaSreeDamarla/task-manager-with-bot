$version: "2.0"
namespace demo

use demo.traits#dynamoCrud

@dynamoCrud(tableName: "Tasks", hashKey: "id")
structure Task {
    @required
    id: String

    @required
    title: String

    description: String
    status: String
    project: String
    createdAt: Long
}
