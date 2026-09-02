import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent database path
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "appointments.json");

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  const initialSeed = [
    {
      id: "LLT-1082",
      name: "Ayesha Khan",
      phone: "+92 321 9876543",
      service: "Gharara",
      date: "2026-09-08",
      requirements: "Festive wedding gharara stitching with golden dori work and matching dupatta piping.",
      status: "confirmed",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "LLT-1081",
      name: "Sana Tariq",
      phone: "+92 333 4567890",
      service: "Ladies Shirt",
      date: "2026-09-05",
      requirements: "Kurti stitching with boat neck and cuff sleeves design.",
      status: "pending",
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ];
  fs.writeFileSync(DB_FILE, JSON.stringify(initialSeed, null, 2), "utf-8");
}

function readAppointments() {
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return [];
  }
}

function writeAppointments(data: any[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET all appointments
app.get("/api/appointments", (req, res) => {
  const appointments = readAppointments();
  // Return sorted newest first
  appointments.sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, count: appointments.length, appointments });
});

// POST new appointment
app.post("/api/appointments", (req, res) => {
  try {
    const { name, phone, service, date, requirements } = req.body;

    if (!name || !phone || !service || !date) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: Name, Phone, Service, and Date are required.",
      });
    }

    const appointments = readAppointments();

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const id = `LLT-${randomNum}`;

    const newAppointment = {
      id,
      name: String(name).trim(),
      phone: String(phone).trim(),
      service: String(service).trim(),
      date: String(date).trim(),
      requirements: requirements ? String(requirements).trim() : "Standard stitching",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    appointments.unshift(newAppointment);
    writeAppointments(appointments);

    console.log(`[Appointment Stored] ID: ${id}, Name: ${newAppointment.name}, Phone: ${newAppointment.phone}`);

    return res.status(201).json({
      success: true,
      message: "Appointment successfully stored in database.",
      appointment: newAppointment,
    });
  } catch (err: any) {
    console.error("Error creating appointment:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error while saving appointment.",
    });
  }
});

// PATCH update status
app.patch("/api/appointments/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const appointments = readAppointments();
  const item = appointments.find((a: any) => a.id === id);

  if (!item) {
    return res.status(404).json({ success: false, error: "Appointment not found." });
  }

  if (status) {
    item.status = status;
  }

  writeAppointments(appointments);
  res.json({ success: true, appointment: item });
});

// DELETE appointment
app.delete("/api/appointments/:id", (req, res) => {
  const { id } = req.params;
  const appointments = readAppointments();
  const filtered = appointments.filter((a: any) => a.id !== id);

  if (filtered.length === appointments.length) {
    return res.status(404).json({ success: false, error: "Appointment not found." });
  }

  writeAppointments(filtered);
  res.json({ success: true, message: "Appointment deleted successfully." });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Laiba Ladies Tailors server running on port ${PORT}`);
  });
}

startServer();
