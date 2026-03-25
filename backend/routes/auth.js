/**
 * Auth Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 * POST /api/auth/fcm-token  (save device FCM token for push notifications)
 */

const router = require("express").Router();
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_in_prod";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// ─── Register ─────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("admin", "facility", "student").default("student"),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const existing = await User.findOne({ email: value.email });
    if (existing) return res.status(409).json({ error: "Email already registered." });

    const user = await User.create(value);
    const token = signToken(user._id);

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required." });

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get current user ─────────────────────────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ─── Save FCM token for push notifications ────────────────────────────────────
router.post("/fcm-token", authenticate, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "FCM token required." });

  try {
    await User.findByIdAndUpdate(req.user._id, { fcmToken: token });
    res.json({ message: "FCM token saved." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
