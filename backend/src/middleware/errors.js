const { ZodError } = require("zod");

const validate = (schema, where = "body") => (req, res, next) => {
  const r = schema.safeParse(req[where]);
  if (!r.success) return res.status(400).json({ error: "Invalid request", details: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  req[where] = r.data;
  next();
};

// Express 5 forwards async errors here.
const errorHandler = (e, req, res, next) => { // eslint-disable-line no-unused-vars
  if (e instanceof ZodError) return res.status(400).json({ error: "Invalid request" });
  if (e.code === 11000) return res.status(409).json({ error: "Already exists" });
  if (e.status) return res.status(e.status).json({ error: e.message, code: e.code });
  console.error(e);
  res.status(500).json({ error: "Internal server error" });
};

module.exports = { validate, errorHandler };
