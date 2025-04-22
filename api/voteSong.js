const { TableClient } = require("@azure/data-tables");

const connectionString = process.env["TABLE_CONNECTION_STRING"];
const tableName = "SongQueue";

module.exports = async function (context, req) {
  const { PartitionKey, RowKey } = req.body;

  if (!PartitionKey || !RowKey) {
    return (context.res = {
      status: 400,
      body: "Missing PartitionKey or RowKey",
    });
  }

  try {
    const client = TableClient.fromConnectionString(connectionString, tableName);
    const entity = await client.getEntity(PartitionKey, RowKey);
    entity.Votes += 1;
    await client.updateEntity(entity, "Replace");

    context.res = {
      status: 200,
      body: { message: "Vote updated!" },
    };
  } catch (err) {
    context.log("Error updating vote:", err.message);
    context.res = {
      status: 500,
      body: "Failed to vote",
    };
  }
};
