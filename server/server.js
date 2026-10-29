
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const Medicine = require("./models/Medicine");
const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
}));

app.use(express.json({ limit: "10kb" }));

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Please log in first." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({
      message: "Your session has expired. Please log in again.",
    });
  }
}

// Check whether the API is running
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create an administrator account from private server configuration
async function createAdminIfNeeded() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Admin setup skipped: admin environment variables missing.");
    return;
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }

  const existingAdmin = await User.findOne({ email });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: "Administrator",
      email,
      password: hashedPassword,
      role: "admin"
    });

    console.log("Administrator account created.");
  }
}

// Registration: public users can register only as elderly or caregiver
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({
        message: "Enter a name of 1 to 100 characters."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Enter a valid email address."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "Password must be 8 to 72 characters."
      });
    }

    if (!["elderly", "caregiver"].includes(role)) {
      return res.status(400).json({
        message: "Choose Elderly user or Caregiver."
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role
    });

    return res.status(201).json({
      message: "Registration successful. You can now log in.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed. Please try again."
    });
  }
});

// Login: verify email and password
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }
});

/* Get medicines belonging to the logged-in user */
app.get("/api/medicines", authenticateToken, async (req, res) => {
  try {
    const medicines = await Medicine.find({ user: req.userId })
      .sort({ createdAt: -1 });

    res.json(medicines);
  } catch (error) {
    console.error("Get medicines error:", error.message);
    res.status(500).json({ message: "Could not load medicines." });
  }
});

/* Add a medicine for the logged-in user */
app.post("/api/medicines", authenticateToken, async (req, res) => {
  try {
    const { name, dosage, time } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof dosage !== "string" ||
      !dosage.trim() ||
      typeof time !== "string" ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
      return res.status(400).json({
        message: "Enter a medicine name, dosage, and valid time.",
      });
    }

    const medicine = await Medicine.create({
      user: req.userId,
      name: name.trim(),
      dosage: dosage.trim(),
      time,
    });

    res.status(201).json(medicine);
  } catch (error) {
    console.error("Add medicine error:", error.message);
    res.status(500).json({ message: "Could not add medicine." });
  }
});

/* Delete a medicine only if it belongs to the logged-in user */
app.delete("/api/medicines/:id", authenticateToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid medicine ID." });
    }

    const medicine = await Medicine.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found or you do not have permission to delete it.",
      });
    }

    res.json({ message: "Medicine deleted successfully." });
  } catch (error) {
    console.error("Delete medicine error:", error.message);
    res.status(500).json({ message: "Could not delete medicine." });
  }
});

// Start only after validating configuration and connecting to MongoDB
async function startServer() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from server/.env");
  }

  if (!process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  await createAdminIfNeeded();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
