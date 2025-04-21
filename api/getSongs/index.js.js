const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  const tableName = "SongQueue";
  const sasUrl = "https://songqueueapp.table.core.windows.net";
  const sasToken = "sv=2024-11-04&ss=t&srt=sco&sp=rdau&se=2025-04-28T14:11:02Z&st=2025-04-21T06:11:02Z&spr=https&sig=X38uzQbzdrzO1Z7YAiJg9gbLDtc7FqT5Y5%2FJDkhaD6g%3D";

  try {
    const client = new TableClient(`${sasUrl}?${sasToken}`, tableName);
    const entities = client.listEntities();
    const results = [];

    for await (const entity of entities) {
      results.push(entity);
    }

    context.res = {
      status: 200,
      body: results,
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: `Error: ${err.message}`,
    };
  }
};
