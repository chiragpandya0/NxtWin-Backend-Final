// Local dev helper: in-memory MongoDB replica set (transactions need one). Prints the URI and keeps running.
const { MongoMemoryReplSet } = require("mongodb-memory-server");
MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ port: Number(process.env.DEV_DB_PORT || 27019) }] })
  .then((r) => console.log("READY", r.getUri("gaffr")));
