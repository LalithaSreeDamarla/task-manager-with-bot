package demo.crud;

import java.util.*;
import java.util.stream.Collectors;

import software.amazon.smithy.build.PluginContext;
import software.amazon.smithy.build.SmithyBuildPlugin;
import software.amazon.smithy.model.Model;
import software.amazon.smithy.model.shapes.MemberShape;
import software.amazon.smithy.model.shapes.Shape;
import software.amazon.smithy.model.shapes.ShapeId;
import software.amazon.smithy.model.shapes.StructureShape;
import software.amazon.smithy.model.traits.Trait;

public final class CrudPlugin implements SmithyBuildPlugin {

    private static final String TRAIT_ID = "demo.traits#dynamoCrud";

    @Override
    public String getName() { return "crud"; }

    @Override
    public void execute(PluginContext context) {
        Model model = context.getModel();

        // Find structures with @demo.traits#dynamoCrud
        List<StructureShape> entities = model.shapes(StructureShape.class)
                .filter(s -> s.findTrait(ShapeId.from(TRAIT_ID)).isPresent())
                .collect(Collectors.toList());

        if (entities.isEmpty()) {
            context.getFileManifest().writeFile("crud/README.txt",
                    "No structures annotated with @demo.traits#dynamoCrud were found.");
            return;
        }

        for (StructureShape entity : entities) {
            // Read custom trait values
            Trait t = entity.findTrait(ShapeId.from(TRAIT_ID)).get();
            var traitNode = t.toNode().expectObjectNode();
            String table = traitNode.expectStringMember("tableName").getValue();
            String hashKey = traitNode.getStringMemberOrDefault("hashKey", "id");

            String entityName = entity.getId().getName(); // e.g., Task
            String lcName = lowerFirst(entityName);

            // Build TS type from members
            List<MemberShape> members = new ArrayList<>(entity.getAllMembers().values());
            members.sort(Comparator.comparing(MemberShape::getMemberName));
            String tsFields = members.stream()
                    .map(m -> "  " + m.getMemberName() + ": " + tsType(model.expectShape(m.getTarget())) + ";")
                    .collect(Collectors.joining("\n"));

            String base = "crud/" + entityName;
            context.getFileManifest().writeFile(base + "/types.ts", "export type " + entityName + " = {\n" + tsFields + "\n};\n");
            context.getFileManifest().writeFile(base + "/create.ts", createTemplate(entityName, table));
            context.getFileManifest().writeFile(base + "/read.ts",   readTemplate(entityName, lcName, table, hashKey));
            context.getFileManifest().writeFile(base + "/update.ts", updateTemplate(entityName, table, hashKey));
            context.getFileManifest().writeFile(base + "/delete.ts", deleteTemplate(entityName, table, hashKey));
            context.getFileManifest().writeFile(base + "/index.ts",  indexTemplate(entityName));
        }
    }

    // ------------ helpers ------------

    private static String lowerFirst(String s) {
        return s.isEmpty() ? s : Character.toLowerCase(s.charAt(0)) + s.substring(1);
    }

    private static String tsType(Shape shape) {
        switch (shape.getType()) {
            case STRING:   return "string";
            case INTEGER:
            case LONG:
            case BYTE:
            case SHORT:
            case DOUBLE:
            case FLOAT:    return "number";
            case BOOLEAN:  return "boolean";
            case TIMESTAMP:return "string"; // ISO
            case LIST:
            case SET:      return "any[]";
            case MAP:      return "Record<string, any>";
            case STRUCTURE:return "Record<string, any>";
            default:       return "any";
        }
    }

    // ------------ TS templates ------------

    private static String header() {
        return ""
            + "import { DynamoDBClient } from \"@aws-sdk/client-dynamodb\";\n"
            + "import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } from \"@aws-sdk/lib-dynamodb\";\n"
            + "const client = new DynamoDBClient({});\n"
            + "const ddb = DynamoDBDocumentClient.from(client);\n"
            + "const res = (code: number, body?: unknown) => ({\n"
            + "  statusCode: code,\n"
            + "  headers: {\n"
            + "    \"Content-Type\": \"application/json\",\n"
            + "    \"Access-Control-Allow-Origin\": \"*\",\n"
            + "    \"Access-Control-Allow-Headers\": \"Content-Type,Authorization\",\n"
            + "    \"Access-Control-Allow-Methods\": \"GET,POST,PUT,DELETE,OPTIONS\"\n"
            + "  },\n"
            + "  body: body === undefined ? undefined : JSON.stringify(body)\n"
            + "});\n\n";
    }

    private static String createTemplate(String entity, String table) {
        return header()
            + "export const create" + entity + " = async (event: any) => {\n"
            + "  if (event.httpMethod === \"OPTIONS\") return res(200, { ok: true });\n"
            + "  const body = typeof event.body === \"string\" ? JSON.parse(event.body || \"{}\") : (event.body || {});\n"
            + "  const item = { ...body, id: body.id ?? (globalThis.crypto?.randomUUID?.() ?? String(Date.now())), createdAt: Date.now() };\n"
            + "  await ddb.send(new PutCommand({ TableName: \"" + table + "\", Item: item }));\n"
            + "  return res(201, item);\n"
            + "}\n";
    }

    private static String readTemplate(String entity, String lc, String table, String hashKey) {
        return header()
            + "export const list" + entity + "s = async () => {\n"
            + "  const out = await ddb.send(new ScanCommand({ TableName: \"" + table + "\" }));\n"
            + "  return res(200, out.Items ?? []);\n"
            + "}\n\n"
            + "export const get" + entity + " = async (event: any) => {\n"
            + "  const id = event.pathParameters?.id;\n"
            + "  if (!id) return res(400, { error: \"id required\" });\n"
            + "  const out = await ddb.send(new GetCommand({ TableName: \"" + table + "\", Key: { \"" + hashKey + "\": id } }));\n"
            + "  return out.Item ? res(200, out.Item) : res(404, { error: \"" + lc + " not found\" });\n"
            + "}\n";
    }

    private static String updateTemplate(String entity, String table, String hashKey) {
        return header()
            + "export const update" + entity + " = async (event: any) => {\n"
            + "  const id = event.pathParameters?.id;\n"
            + "  if (!id) return res(400, { error: \"id required\" });\n"
            + "  const body = typeof event.body === \"string\" ? JSON.parse(event.body || \"{}\") : (event.body || {});\n"
            + "  const names: Record<string,string> = {}; const values: Record<string,unknown> = {}; const sets: string[] = [];\n"
            + "  for (const [k,v] of Object.entries(body)) { if (v === undefined) continue; names[\"#\"+k]=k; values[\":\"+k]=v; sets.push(`#${k} = :${k}`); }\n"
            + "  if (sets.length === 0) return res(400, { error: \"no fields\" });\n"
            + "  const out = await ddb.send(new UpdateCommand({\n"
            + "    TableName: \"" + table + "\", Key: { \"" + hashKey + "\": id },\n"
            + "    UpdateExpression: `SET ${sets.join(\", \")}`,\n"
            + "    ExpressionAttributeNames: names,\n"
            + "    ExpressionAttributeValues: values,\n"
            + "    ReturnValues: \"ALL_NEW\"\n"
            + "  }));\n"
            + "  return res(200, out.Attributes);\n"
            + "}\n";
    }

    private static String deleteTemplate(String entity, String table, String hashKey) {
        return header()
            + "export const delete" + entity + " = async (event: any) => {\n"
            + "  const id = event.pathParameters?.id;\n"
            + "  if (!id) return res(400, { error: \"id required\" });\n"
            + "  await ddb.send(new DeleteCommand({ TableName: \"" + table + "\", Key: { \"" + hashKey + "\": id } }));\n"
            + "  return res(204);\n"
            + "}\n";
    }

    private static String indexTemplate(String entity) {
        return ""
            + "export { create" + entity + " } from \"./create\";\n"
            + "export { list" + entity + "s, get" + entity + " } from \"./read\";\n"
            + "export { update" + entity + " } from \"./update\";\n"
            + "export { delete" + entity + " } from \"./delete\";\n";
    }
}
