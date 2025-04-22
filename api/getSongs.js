const { TableClient } = require("@azure/data-tables");

const connectionString = process.env["TABLE_CONNECTION_STRING"];
const tableName = "SongQueue";

module.exports = async function (context, req) {
  try {
    const client = TableClient.fromConnectionString(connectionString, tableName);
    const entities = client.listEntities();

    const results = [];
    for await (const entity of entities) {
      results.push({
        title: entity.Title,
        artist: entity.Artist,
        votes: entity.Votes,
        partitionKey: entity.PartitionKey,
        rowKey: entity.RowKey,
      });
    }

    context.res = {
      status: 200,
      body: results,
    };
  } catch (err) {
    context.log("Error fetching songs:", err.message);
    context.res = {
      status: 500,
      body: "Failed to fetch songs",
    };
  }
};
