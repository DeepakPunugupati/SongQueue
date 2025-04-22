const { TableClient } = require("@azure/data-tables");

const connectionString = process.env["TABLE_CONNECTION_STRING"];
const tableName = "SongQueue";

module.exports = async function (context, req) {
  try {
    const client = TableClient.fromConnectionString(connectionString, tableName);

    const song = req.body;
    await client.createEntity(song);

    context.res = {
      status: 200,
      body: { message: "Song added" },
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: "Failed to add song",
    };
  }
};
