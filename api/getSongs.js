const { TableClient } = require("@azure/data-tables");
const connectionString = process.env["TABLE_CONNECTION_STRING"];
const tableName = "SongQueue";

module.exports = async function (context, req) {
  try {
    const client = TableClient.fromConnectionString(connectionString, tableName);
    const entities = [];
    for await (const entity of client.listEntities()) {
      entities.push(entity);
    }

    context.res = {
      status: 200,
      body: entities,
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: "Failed to fetch songs",
    };
  }
};
