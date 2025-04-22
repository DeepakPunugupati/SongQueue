const { TableClient } = require("@azure/data-tables");

const connectionString = process.env["TABLE_CONNECTION_STRING"];
const tableName = "SongQueue";

module.exports = async function (context, req) {
  try {
    const client = TableClient.fromConnectionString(connectionString, tableName);
    const entities = client.listEntities();

    const deleteOps = [];
    for await (const entity of entities) {
      deleteOps.push(
        client.deleteEntity(entity.partitionKey, entity.rowKey)
      );
    }

    await Promise.all(deleteOps);

    context.res = {
      status: 200,
      body: "All songs cleared!",
    };
  } catch (err) {
    context.log("Error resetting songs:", err.message);
    context.res = {
      status: 500,
      body: "Failed to reset songs",
    };
  }
};
