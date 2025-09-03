$version: "2.0"
namespace demo.traits

/// Marks a structure as DynamoDB-backed entity for CRUD generation
@trait
structure dynamoCrud {
    tableName: String,
    hashKey: String = "id"
}
