import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "merchant-portal-dev-secret";

export const signAuthToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireRole = (role) => (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.auth.role !== role) {
    return res
      .status(403)
      .json({ error: "You do not have access to this resource" });
  }

  return next();
};
