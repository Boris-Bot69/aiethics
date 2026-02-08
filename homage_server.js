import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "node:fs/promises";
import rateLimit from "express-rate-limit";
import {
    validateUser,
    createUser,
    deleteUser,
    listUsers,
    extendAccess,
    ensureUsersDB
} from "./auth/userManager.js";

dotenv.config();

// Initialize users database
ensureUsersDB().catch(console.error);

// Admin secret for admin panel access
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin123";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "your-secret-key-change-in-production";

console.log("ADMIN_SECRET:", ADMIN_SECRET ? "set" : "missing");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================================================
   CORS (optional, but safe for localhost + render)
============================================================ */
const allowedOrigins = [
    "http://localhost:3000",
    "https://aiethics-5ncx.onrender.com",
];

const corsMiddleware = cors({
    origin(origin, callback) {
        // allow same-origin calls (no Origin header) + allowed list
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
});

// IMPORTANT for Express + path-to-regexp v6: don't use "*" string
app.use(corsMiddleware);
app.options(/.*/, corsMiddleware);

/* ============================================================
   Parsers
============================================================ */
app.use(cookieParser(COOKIE_SECRET)); // Enable signed cookies
app.use(bodyParser.json({ limit: "1000mb" }));
app.use(bodyParser.urlencoded({ limit: "1000mb", extended: true }));

/* ============================================================
   Rate Limiting
============================================================ */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: "Too many login attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

const adminLoginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: { error: "Too many admin login attempts. Please try again in 1 hour." },
    standardHeaders: true,
    legacyHeaders: false,
});

/* ============================================================
   Public static assets (CSS/JS/Images)
   These must be public, otherwise your pages look "unstyled".
============================================================ */
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/images", express.static(path.join(__dirname, "images")));

/* ============================================================
   Health check
============================================================ */
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

/* ============================================================
   Cookie login - Secure with bcrypt and time-limited access
============================================================ */
function isAuthed(req) {
    // Check signed cookie for username
    return req.signedCookies?.site_auth != null;
}

function getAuthUsername(req) {
    return req.signedCookies?.site_auth || null;
}

function isAdminAuthed(req) {
    return req.signedCookies?.admin_auth === "1";
}

function requireLogin(req, res, next) {
    if (req.method === "OPTIONS") return next();
    if (req.path === "/login" || req.path === "/logout" || req.path === "/me") return next();
    if (req.path === "/healthz") return next();

    // Admin routes have their own auth
    if (req.path.startsWith("/admin")) return next();

    if (req.path.startsWith("/css/")) return next();
    if (req.path.startsWith("/js/")) return next();
    if (req.path.startsWith("/images/")) return next();

    if (req.path === "/" || req.path === "/index.html") return next();
    if (req.path === "/admin.html") return next();

    if (isAuthed(req)) return next();
    return res.status(401).send("Please login first.");
}

function requireAdmin(req, res, next) {
    if (!isAdminAuthed(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
    }
    next();
}


app.post("/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body || {};

    console.log("Login attempt:", { username, password: password ? "***" : "missing" });

    if (!username || !password) {
        return res.status(400).json({ ok: false, error: "Username and password required" });
    }

    try {
        const result = await validateUser(username, password);

        if (result.valid) {
            // Set signed cookie with username, auto-expire with user
            res.cookie("site_auth", result.username, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                signed: true,
                sameSite: "lax",
                path: "/",
                maxAge: Math.min(result.remainingMs, 7 * 24 * 60 * 60 * 1000) // Cap at 7 days
            });
            console.log(`Login successful for ${result.username} - expires ${result.expiresAt}`);
            return res.json({
                ok: true,
                username: result.username,
                expiresAt: result.expiresAt
            });
        }

        console.log("Login failed:", result.error);
        return res.status(401).json({ ok: false, error: result.error });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ ok: false, error: "Login failed" });
    }
});

app.post("/logout", (req, res) => {
    console.log("Logout - clearing cookie");
    res.clearCookie("site_auth", { path: "/", signed: true });
    res.json({ ok: true });
});

/* ============================================================
   Admin Authentication & API Routes
============================================================ */
app.post("/admin/login", adminLoginLimiter, (req, res) => {
    const { secret } = req.body || {};

    if (secret === ADMIN_SECRET) {
        res.cookie("admin_auth", "1", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            signed: true,
            sameSite: "lax",
            path: "/",
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });
        console.log("Admin login successful");
        return res.json({ ok: true });
    }

    console.log("Admin login failed: invalid secret");
    return res.status(401).json({ error: "Invalid admin secret" });
});

app.post("/admin/logout", (req, res) => {
    res.clearCookie("admin_auth", { path: "/", signed: true });
    res.json({ ok: true });
});

app.get("/admin/me", (req, res) => {
    res.json({ authed: isAdminAuthed(req) });
});

// List all users
app.get("/admin/users", requireAdmin, async (req, res) => {
    try {
        const users = await listUsers();
        res.json(users);
    } catch (err) {
        console.error("Error listing users:", err);
        res.status(500).json({ error: "Failed to list users" });
    }
});

// Create a new user
app.post("/admin/users", requireAdmin, async (req, res) => {
    const { username, password, days } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    try {
        const result = await createUser(username, password, days || 7, "admin");
        if (result.success) {
            console.log(`Admin created user: ${username}`);
            res.json({ success: true, user: result.user });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (err) {
        console.error("Error creating user:", err);
        res.status(500).json({ error: "Failed to create user" });
    }
});

// Extend user access
app.put("/admin/users/:username/extend", requireAdmin, async (req, res) => {
    const { username } = req.params;
    const { days } = req.body || {};

    if (!days || days <= 0) {
        return res.status(400).json({ error: "Days must be a positive number" });
    }

    try {
        const result = await extendAccess(username, days);
        if (result.success) {
            console.log(`Admin extended access for ${username} by ${days} days`);
            res.json({ success: true, newExpiresAt: result.newExpiresAt });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (err) {
        console.error("Error extending access:", err);
        res.status(500).json({ error: "Failed to extend access" });
    }
});

// Delete a user
app.delete("/admin/users/:username", requireAdmin, async (req, res) => {
    const { username } = req.params;

    try {
        const result = await deleteUser(username);
        if (result.success) {
            console.log(`Admin deleted user: ${username}`);
            res.json({ success: true });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
});


app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/index.html", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/admin.html", (_req, res) => res.sendFile(path.join(__dirname, "admin.html")));

// Explicit routes for feedback.html (handle both with and without .html extension)
app.get("/feedback.html", requireLogin, (req, res) => {
    const filePath = path.join(__dirname, "feedback.html");
    console.log("Serving feedback.html from:", filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error serving feedback.html:", err);
            res.status(500).send("Error loading feedback page");
        }
    });
});

app.get("/feedback", requireLogin, (req, res) => {
    const filePath = path.join(__dirname, "feedback.html");
    console.log("Serving feedback (redirecting to feedback.html) from:", filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error serving feedback:", err);
            res.status(500).send("Error loading feedback page");
        }
    });
});


app.get("/me", async (req, res) => {
    const authed = isAuthed(req);
    const username = getAuthUsername(req);

    console.log("/me check - isAuthed:", authed, "username:", username);

    // If authed, re-validate to get expiration info
    let expiresAt = null;
    let daysRemaining = null;

    if (authed && username) {
        try {
            const users = await listUsers();
            const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (user) {
                expiresAt = user.expiresAt;
                daysRemaining = user.daysUntilExpiry;
            }
        } catch (e) {
            console.error("Error fetching user info:", e);
        }
    }

    res.json({
        authed,
        username: authed ? username : null,
        expiresAt,
        daysRemaining
    });
});

app.use("/html", requireLogin, express.static(path.join(__dirname, "html")));

/* ============================================================
   Feedback API - Store feedback in CSV file
============================================================ */
const FEEDBACK_CSV_PATH = path.join(__dirname, "feedback.csv");

// Escape CSV field (handle commas, quotes, newlines)
function escapeCSV(field) {
    if (field === null || field === undefined) return "";
    const str = String(field);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// Ensure CSV file exists with headers
async function ensureFeedbackCSV() {
    try {
        await fs.access(FEEDBACK_CSV_PATH);
    } catch {
        const headers = "timestamp,name,email,generalFeedback,activities,scenarios,ip\n";
        await fs.writeFile(FEEDBACK_CSV_PATH, headers, "utf-8");
    }
}

// Initialize CSV on server start
ensureFeedbackCSV().catch(console.error);

app.post("/api/feedback", requireLogin, async (req, res) => {
    try {
        const { name, email, generalFeedback, activities, scenarios, timestamp } = req.body;

        // Validate that at least one activity or scenario is provided
        if ((!activities || activities.length === 0) && (!scenarios || scenarios.length === 0)) {
            return res.status(400).json({ error: "Please select at least one activity or scenario" });
        }

        await ensureFeedbackCSV();

        // Format activities and scenarios as JSON strings for CSV
        const activitiesStr = activities ? JSON.stringify(activities) : "";
        const scenariosStr = scenarios ? JSON.stringify(scenarios) : "";

        const row = [
            escapeCSV(timestamp || new Date().toISOString()),
            escapeCSV(name || "Anonymous"),
            escapeCSV(email || ""),
            escapeCSV(generalFeedback || ""),
            escapeCSV(activitiesStr),
            escapeCSV(scenariosStr),
            escapeCSV(req.ip || req.connection.remoteAddress)
        ].join(",") + "\n";

        await fs.appendFile(FEEDBACK_CSV_PATH, row, "utf-8");

        const activityCount = activities ? activities.length : 0;
        const scenarioCount = scenarios ? scenarios.length : 0;
        console.log("Feedback submitted to CSV:", {
            activities: activityCount,
            scenarios: scenarioCount
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Error saving feedback:", error);
        res.status(500).json({ error: "Failed to save feedback" });
    }
});

// Admin endpoint to download feedback CSV
app.get("/api/feedback", requireLogin, async (req, res) => {
    try {
        await ensureFeedbackCSV();
        const csvContent = await fs.readFile(FEEDBACK_CSV_PATH, "utf-8");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=feedback.csv");
        res.send(csvContent);
    } catch (error) {
        console.error("Error reading feedback:", error);
        res.status(500).json({ error: "Failed to read feedback" });
    }
});

const ROOT_HTML_PAGES = new Set([
    "ai_ethics_activities.html",
    "ai_ethics_scenarios.html",
    "oecd_principles.html",
    "privacy.html",
    "research.html",
    "imprint.html",
    "feedback.html",
]);

app.get("/:page", requireLogin, (req, res, next) => {
    const page = req.params.page;

    if (!ROOT_HTML_PAGES.has(page)) return next(); // not one of your root html pages

    return res.sendFile(path.join(__dirname, page));
});

/* ============================================================
   Everything below is protected (APIs, page routes, etc.)
============================================================ */
app.use(requireLogin);

/* ============================================================
   Your existing routes (kept)
============================================================ */
const HTML_BASE = path.join(__dirname, "html", "ai_activities_webpages");

app.get("/homage", (_req, res) => res.sendFile(path.join(HTML_BASE, "homage.html")));
app.get("/magazine", (_req, res) => res.sendFile(path.join(HTML_BASE, "magazine_cutouts.html")));
app.get("/expanded", (_req, res) => res.sendFile(path.join(HTML_BASE, "expanded_frames.html")));
app.get("/texture", (_req, res) => res.sendFile(path.join(HTML_BASE, "drawing_texture.html")));


// GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const sessions = new Map();

// --- API: generate one image per prompt ---
app.post("/generate", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "Missing 'prompt' string" });
        }

        console.log("Generating image for:", prompt);

        const response = await ai.models.generateImages({
            model: "imagen-4.0-generate-001",
            prompt,
            config: { numberOfImages: 1 },
        });

        const imgBase64 = response.generatedImages?.[0]?.image?.imageBytes;
        if (!imgBase64) {
            return res.status(500).json({ error: "No image returned from model" });
        }

        res.json({ image: imgBase64 });
    } catch (err) {
        console.error("Error generating image:", err);
        res.status(500).json({ error: err.message || "Unknown error" });
    }
});


// --- API: magazine cut-outs image edit ---
app.post("/edit-magazine", async (req, res) => {
    try {
        const { imageBase64, prompt } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: "Missing image upload" });
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
                {
                    inlineData: {
                        data: imageBase64.split(",")[1],
                        mimeType: imageBase64.includes("png") ? "image/png" : "image/jpeg",
                    },
                },
                { text: prompt || "Enhance or edit this drawing creatively." },
            ],
            config: { responseModalities: ["IMAGE"] },
        });

        const imgPart = response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (!imgPart) {
            return res.status(500).json({ error: "No image returned from model" });
        }

        res.json({
            image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
        });
    } catch (err) {
        console.error("/edit-magazine error:", err);
        res.status(500).json({ error: err.message || "Unknown error" });
    }
});



app.post("/mix-texture", async (req, res) => {
    try {
        const { structureBase64, textureBase64, strength, prompt } = req.body;
        if (!structureBase64 || !textureBase64) {
            return res.status(400).json({ error: "Both images are required" });
        }


        const defaultInstruction =
            `You are a texture-to-structure fusion tool. 
       Take the first image as the STRUCTURE (the main content, shapes, edges).
       Take the second image as the TEXTURE (the material/style).
       Fuse them so that the texture conforms to the surfaces and contours of the structure.
       Preserve structure edges and silhouettes. Avoid warping the global composition.
       Use a texture strength of ${Math.max(0, Math.min(1, Number(strength ?? 0.6)))} 
       (0=ignore texture, 1=strong texture dominance).
       Output exactly one fused image.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
                // STRUCTURE image first
                {
                    inlineData: {
                        data: toRaw(structureBase64),
                        mimeType: structureBase64.includes("image/png") ? "image/png" : "image/jpeg",
                    },
                },
                // TEXTURE image second
                {
                    inlineData: {
                        data: toRaw(textureBase64),
                        mimeType: textureBase64.includes("image/png") ? "image/png" : "image/jpeg",
                    },
                },
                // Instruction + optional user prompt
                {
                    text:
                        (prompt?.trim()
                            ? `Base instruction:\n${defaultInstruction}\n\nUser request:\n${prompt.trim()}`
                            : defaultInstruction),
                },
            ],
            // Ask for image + (optional) short text
            config: { responseModalities: ["TEXT", "IMAGE"] },
        });

        // Find the first image part in the response
        const parts = response?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p) => p.inlineData?.data);
        if (!imgPart) {
            const maybeText = parts.map((p) => p.text).filter(Boolean).join("\n").slice(0, 500);
            return res
                .status(500)
                .json({ error: "No image returned from model", details: maybeText || undefined });
        }

        // Return a data URL so the browser can <img src="...">
        const mime = imgPart.inlineData.mimeType || "image/png";
        const base64 = imgPart.inlineData.data; // already base64
        res.json({ imageDataUrl: `data:${mime};base64,${base64}` });
    } catch (err) {
        console.error("❌ /mix-texture error:", err);
        res.status(500).json({ error: err.message || "Unknown error" });
    }
});

app.post("/expand_canvas", async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "Missing image data" });

        const baseBuf = Buffer.from(image.split(",")[1], "base64");
        const meta = await sharp(baseBuf).metadata();

        // Add 25% margin around
        const margin = Math.round(meta.width * 0.25);
        const newW = meta.width + margin * 2;
        const newH = meta.height + margin * 2;

        // Composite onto a slightly neutral background
        const extended = await sharp({
            create: {
                width: newW,
                height: newH,
                channels: 4,
                background: { r: 245, g: 245, b: 245, alpha: 1 },
            },
        })
            .composite([{ input: baseBuf, top: margin, left: margin }])
            .png()
            .toBuffer();

        // Simple, natural prompt
        const prompt = `
Just expand the image outward naturally.
Keep everything in the original area completely unchanged.
Extend the scene smoothly beyond the borders, continuing background and lighting.
Do not zoom out or add any borders or frames.
`;

        console.log("🎨 Expanding image naturally...");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
                { inlineData: { data: extended.toString("base64"), mimeType: "image/png" } },
                { text: prompt },
            ],
            config: { responseModalities: ["IMAGE"], temperature: 0.7 },
        });

        const part = response?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        if (!part) throw new Error("No image returned from Gemini.");

        res.json({
            image_url: `data:image/png;base64,${part.inlineData.data}`,
        });
    } catch (err) {
        console.error("❌ /expand_canvas error:", err);
        res.status(500).json({ error: err.message });
    }
});


/* ============================================================
   SUMMARY PDF
============================================================ */
app.get("/summary_a4", async (_req, res) => {
    try {
        console.log("🧩 Generating summary PDF...");
        const layers = ["A8", "A7", "A6", "A5", "A4"];
        const imgs = [];

        for (const key of layers) {
            const img = frames[key];
            if (!img) continue;
            const buf = await sharp(Buffer.from(toRaw(img), "base64"))
                .resize({ width: 1000 })
                .png()
                .toBuffer();
            imgs.push({ key, buf });
        }

        if (imgs.length === 0) {
            return res.status(400).json({ error: "No frames available for summary." });
        }

        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);

        for (const { key, buf } of imgs) {
            const img = await pdf.embedPng(buf);
            const { width, height } = img.scale(0.7);
            const page = pdf.addPage([595.28, 841.89]);
            const pw = page.getWidth();
            const ph = page.getHeight();
            const text = key === "A8" ? "Original Artwork (A8)" : `Expansion ${key}`;
            const textW = font.widthOfTextAtSize(text, 16);
            page.drawText(text, { x: (pw - textW) / 2, y: ph - 40, size: 16, font, color: rgb(0.1, 0.1, 0.1) });
            page.drawImage(img, { x: (pw - width) / 2, y: (ph - height) / 2 - 20, width, height });
        }

        const pdfBytes = await pdf.save();
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
        res.json({ pdf_url: `data:application/pdf;base64,${pdfBase64}` });
    } catch (err) {
        console.error("❌ /summary_a4 error:", err);
        res.status(500).json({ error: err.message });
    }
});


// AI SUPERHERO

app.post("/generate-panel", async (req, res) => {
    try {
        const { sessionId, imageBase64, prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "Missing prompt" });
        if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

        // Initialize or update session memory
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
                panels: [],
                context: "",
                heroDescription: "",
                ended: false,
            });
        }
        const story = sessions.get(sessionId);
        if (story.ended) {
            return res.json({
                message:
                    "📖 The story has already reached an ending! You can start a new hero if you wish.",
            });
        }

        console.log(`🎨 [${sessionId}] New panel prompt:`, prompt);

        // Build story memory
        story.context += `\nPanel ${story.panels.length + 1}: ${prompt}`;

        const combinedPrompt = `
You are generating the next comic panel in an ongoing story.
Maintain the same main hero identity, costume, and abilities from previous panels.
Show smooth continuity between scenes.

Story so far:
${story.context}

Generate ONE new comic panel in consistent style, without speech bubbles.
If the story logically reaches a conclusion, end it naturally with an emotional or moral closure.
`;

        const contents = [];
        if (imageBase64) {
            contents.push({
                inlineData: {
                    data: imageBase64.split(",")[1],
                    mimeType: imageBase64.includes("png") ? "image/png" : "image/jpeg",
                },
            });
        }
        contents.push({ text: combinedPrompt });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents,
            config: { responseModalities: ["IMAGE"], temperature: 0.8 },
        });

        const part = response?.candidates?.[0]?.content?.parts?.find(
            (p) => p.inlineData?.data
        );
        if (!part) throw new Error("No image returned.");

        const mime = part.inlineData.mimeType || "image/png";
        const base64 = part.inlineData.data;
        story.panels.push({ prompt, image: base64 });

        // Decide if story ends
        if (story.panels.length >= 5) story.ended = true;

        res.json({
            image: `data:${mime};base64,${base64}`,
            ended: story.ended,
        });
    } catch (err) {
        console.error("❌ /generate-panel error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ============================================================
   2️⃣  Suggest next-panel ideas (context-aware)
============================================================ */
app.post("/suggest-panel-prompt", async (req, res) => {
    try {
        const { sessionId } = req.body;
        const story = sessions.get(sessionId);
        const previous = story?.context || "The hero’s story is just beginning.";

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    text: `Continue this superhero comic in one short panel idea.
Story so far:
${previous}

Suggest one creative next event that fits naturally. Keep it positive and concise. It should makes in context`,
                },
            ],
            config: { temperature: 0.9 },
        });

        const suggestion =
            response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            "The hero faces a new challenge involving technology and ethics.";

        res.json({ suggestion });
    } catch (err) {
        console.error("❌ /suggest-panel-prompt error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ============================================================
   3️⃣  Reset story (start new hero)
============================================================ */
app.post("/reset-story", (req, res) => {
    const { sessionId } = req.body;
    sessions.delete(sessionId);
    res.json({ message: "Story reset. You can start a new superhero!" });
});


app.post("/delete-panel", (req, res) => {
    const { sessionId, imageDataUrl } = req.body;
    const story = sessions.get(sessionId);
    if (!story) return res.status(400).json({ error: "Invalid session" });

    story.panels = story.panels.filter(
        (p) => `data:image/png;base64,${p.image}` !== imageDataUrl
    );
    res.json({ message: "Panel deleted" });
});

app.get("/generate-comic-pdf", async (req, res) => {
    try {
        const { sessionId } = req.query;
        const story = sessions.get(sessionId);
        if (!story || !story.panels?.length)
            return res.status(400).json({ error: "No panels found" });

        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);

        // ---- page factory
        const makePage = () => {
            const page = pdf.addPage([595, 842]);            // A4 portrait
            const pageWidth = page.getWidth();
            const pageHeight = page.getHeight();
            const margin = 28;
            const innerW = pageWidth - margin * 2;

            // Title
            page.drawText("AI Superhero Comic", {
                x: margin,
                y: pageHeight - 36,
                size: 18,
                font,
                color: rgb(0.1, 0.1, 0.1),
            });

            // y cursor starts below the title
            const startY = pageHeight - 36 - 16;
            return { page, pageWidth, pageHeight, margin, innerW, y: startY };
        };

        let ctx = makePage();

        // layout constants
        const colGap = 6;              // small gaps for tight packing
        const rowGap = 8;
        const numCols = 2;
        const cellW = (ctx.innerW - colGap) / numCols;

        // Pre-embed images once, keep native sizes
        const items = await Promise.all(
            story.panels.map(async (p) => {
                const img = await pdf.embedPng(Buffer.from(p.image, "base64"));
                const { width, height } = img.scale(1);
                return { img, width, height };
            })
        );

        // Helper: ensure space or add new page
        const ensureSpace = (needed) => {
            if (ctx.y - needed < ctx.margin) {
                ctx = makePage();
            }
        };

        // Draw rows in pairs; if odd, handle last single row centered
        const fullRows = Math.floor(items.length / 2);
        const hasSingleLast = items.length % 2 === 1;

        let index = 0;

        // --- full 2-column rows ---
        for (let r = 0; r < fullRows; r++) {
            const left = items[index];
            const right = items[index + 1];

            // compute scaled heights using fixed cell width
            const scaleL = cellW / left.width;
            const scaleR = cellW / right.width;
            const drawHL = left.height * scaleL;
            const drawHR = right.height * scaleR;
            const rowH = Math.max(drawHL, drawHR); // row height is max of both

            ensureSpace(rowH + rowGap);

            // y position for this row (baseline at bottom of tallest)
            const y = ctx.y - rowH;

            // center each image vertically within the row
            const xL = ctx.margin;
            const yL = y + (rowH - drawHL) / 2;

            const xR = ctx.margin + cellW + colGap;
            const yR = y + (rowH - drawHR) / 2;

            ctx.page.drawImage(left.img,  { x: xL, y: yL, width: cellW, height: drawHL });
            ctx.page.drawImage(right.img, { x: xR, y: yR, width: cellW, height: drawHR });

            ctx.y = y - rowGap; // advance cursor
            index += 2;
        }

        // --- single last row (centered, full width) ---
        if (hasSingleLast) {
            const last = items[index];
            const scale = ctx.innerW / last.width;
            const drawW = ctx.innerW;
            const drawH = last.height * scale;

            ensureSpace(drawH);

            const x = ctx.margin;
            const y = ctx.y - drawH;

            ctx.page.drawImage(last.img, { x, y, width: drawW, height: drawH });
            ctx.y = y - rowGap;
        }

        const pdfBytes = await pdf.save();
        res.json({ pdf: `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}` });
    } catch (err) {
        console.error("/generate-comic-pdf error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ============================================
   1. /pitch — Text generieren
=============================================== */
app.post("/pitch", async (req, res) => {
    try {
        const { prompt } = req.body;

        console.log("[/pitch] Received prompt:", prompt);

        const shortPrompt = `
Extract the main components of the following AI product idea.
List only 3–5 key elements in bullet points.
Avoid explanations or extra text.

Idea:
${prompt}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text: shortPrompt }]
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "No output generated.";

        console.log("[/pitch] Output:", text);

        res.json({ text });

    } catch (err) {
        console.error("[/pitch] Error:", err);
        res.status(500).json({ error: "Pitch generation failed." });
    }
});


app.post("/pitchExample", async (req, res) => {
    try {
        const { idea } = req.body;

        console.log("[/pitchExample] Received idea:", idea);

        const prompt = `
Create a 3-sentence elevator pitch for this AI product idea:
"${idea}"

Tone: confident, clear, and audience-friendly.
Do not explain technical details.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text: prompt }]
        });

        const text =
            response.candidates?.[0]?.content?.parts?.[0]?.text ??
            "No pitch example generated.";

        console.log("[/pitchExample] Output:", text);

        res.json({ text });

    } catch (err) {
        console.error("[/pitchExample] Error:", err);
        res.status(500).json({ error: "Pitch example generation failed." });
    }
});




/* ============================================
   2. /image — Image generieren
=============================================== */
app.post("/image", async (req, res) => {
    try {
        const { prompt } = req.body;

        console.log("[/image] Received prompt:", prompt);

        // 🔹 Enhanced prompt: automatically enforce “no text or labels”
        const enhancedPrompt = `
Create a clean, modern concept-flow or visualization illustration based on:
"${prompt}"

Show the logical relationship between components clearly
(e.g., arrows, data flow, or transformations),
but absolutely DO NOT include any text, letters, words, numbers, or symbols in the image.

Keep the focus purely on visuals, structure, and flow.
Style: 3D or semi-flat design, minimal background, smooth gradients, soft lighting.
Palette: tech-inspired blues, teals, grays.
Aspect ratio: square or 16:9.
        `;

        const response = await ai.models.generateImages({
            model: "imagen-4.0-generate-001",
            prompt: enhancedPrompt,
            config: { numberOfImages: 1 },
        });

        const image = response.generatedImages?.[0]?.image?.imageBytes;

        if (!image) {
            console.log("[/image] No image returned.");
            return res.status(500).json({ error: "No image returned." });
        }

        console.log("[/image] Text-free concept image generated successfully.");

        res.json({ image });

    } catch (err) {
        console.error("[/image] Error:", err);
        res.status(500).json({ error: "Image generation failed." });
    }
});
/* ============================================
   3. /feedback — Stakeholder analysis
=============================================== */
app.post("/feedback", async (req, res) => {
    try {
        const { text } = req.body;

        console.log("[/feedback] Received input:", text);

        const prompt = `
Analyze this AI school product:

"${text}".

Return benefits, risks, harms, stakeholders, OECD principles. Keep it short in total of 100 words.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text: prompt }]
        });

        const output =
            response.candidates?.[0]?.content?.parts?.[0]?.text ??
            "No output generated.";

        console.log("[/feedback] Output:", output);

        res.json({ text: output });

    } catch (err) {
        console.error("[/feedback] Error:", err);
        res.status(500).json({ error: "Feedback generation failed." });
    }
});
/* ============================================
   4. /refine — Idea refinement
=============================================== */
app.post("/refine", async (req, res) => {
    try {
        const { idea, feedback } = req.body;

        console.log("[/refine] Inputs:", { idea, feedback });

        const prompt = `
Refine this AI idea.

Idea:
${idea}

Feedback:
${feedback}

Return a concise improved version with ethical alignment.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text: prompt }]
        });

        const improved =
            response.candidates?.[0]?.content?.parts?.[0]?.text ??
            "No output generated.";

        console.log("[/refine] Output:", improved);

        res.json({ text: improved });

    } catch (err) {
        console.error("[/refine] Error:", err);
        res.status(500).json({ error: "Refinement failed." });
    }
});


app.post("/chat", async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== "string") {
            return res.status(400).json({ error: "Missing 'text' message." });
        }

        console.log("/chat user:", text);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text }],
            config: { temperature: 0.7 }
        });

        const reply =
            response.candidates?.[0]?.content?.parts?.[0]?.text ||
            "I'm not sure what to say.";

        console.log("/chat reply:", reply);

        res.json({ text: reply });

    } catch (err) {
        console.error("/chat error:", err);
        res.status(500).json({ error: "Chat endpoint error." });
    }
});

app.post("/generate-capsule-pdf", async (req, res) => {
    try {
        const { reflection, designs } = req.body;

        if (!reflection || !designs) {
            return res.status(400).json({ error: "Missing Time Capsule data." });
        }

        const pdf = await PDFDocument.create();
        const baseFont = await pdf.embedFont(StandardFonts.Helvetica);

        const pageWidth = 595;   // A4 portrait
        const pageHeight = 842;
        const margin = 40;

        /* ==================== PAGE 1 (TEXT) ==================== */

        const page1 = pdf.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;

        // Title
        page1.drawText("AI Time Capsule", {
            x: margin,
            y,
            font: baseFont,
            size: 22
        });
        y -= 50;

        // Reflection
        page1.drawText("Reflection:", {
            x: margin,
            y,
            font: baseFont,
            size: 16
        });
        y -= 22;

        page1.drawText(reflection || "(No reflection)", {
            x: margin,
            y,
            font: baseFont,
            size: 12,
            maxWidth: pageWidth - margin * 2,
            lineHeight: 14
        });
        y -= 120;

        // Designed text (first text design only, if exists)
        const textDesign = designs.find(d => d.type === "text");

        if (textDesign) {
            page1.drawText("Designed Message:", {
                x: margin,
                y,
                font: baseFont,
                size: 16
            });
            y -= 22;

            page1.drawText(textDesign.content || "(empty)", {
                x: margin,
                y,
                font: baseFont,
                size: 12,
                maxWidth: pageWidth - margin * 2,
                lineHeight: 14
            });
        }

        /* ==================== PAGES 2+ (IMAGES) ==================== */

        const images = designs.filter(d => d.type === "image" && d.src);

        if (images.length > 0) {
            let page = pdf.addPage([pageWidth, pageHeight]);
            let y2 = pageHeight - margin;

            page.drawText("Time Capsule Images", {
                x: margin,
                y: y2,
                font: baseFont,
                size: 18
            });
            y2 -= 40;

            for (let i = 0; i < images.length; i++) {
                const src = images[i].src;
                const parts = src.split(",");
                if (parts.length < 2) continue;

                const header = parts[0];
                const imgBase64 = parts[1];

                const mimeMatch = header.match(/data:(image\/[a-zA-Z0-9+.\-]+);base64/);
                const mime = mimeMatch ? mimeMatch[1] : "image/png";

                const imgBuffer = Buffer.from(imgBase64, "base64");

                let embedded;
                try {
                    if (mime === "image/jpeg" || mime === "image/jpg") {
                        embedded = await pdf.embedJpg(imgBuffer);
                    } else {
                        embedded = await pdf.embedPng(imgBuffer);
                    }
                } catch (e) {
                    console.error("Skipping image due to embed error:", e);
                    continue;
                }

                const maxW = 400;
                const scale = Math.min(1, maxW / embedded.width);
                const w = embedded.width * scale;
                const h = embedded.height * scale;

                if (y2 - h - 50 < margin) {
                    page = pdf.addPage([pageWidth, pageHeight]);
                    y2 = pageHeight - margin;

                    page.drawText("Time Capsule Images (cont.)", {
                        x: margin,
                        y: y2,
                        font: baseFont,
                        size: 16
                    });
                    y2 -= 40;
                }

                page.drawText(`Image ${i + 1} (${images[i].mode})`, {
                    x: margin,
                    y: y2,
                    font: baseFont,
                    size: 12
                });
                y2 -= 20;

                page.drawImage(embedded, {
                    x: margin,
                    y: y2 - h,
                    width: w,
                    height: h
                });

                y2 -= h + 40;
            }
        }

        /* ==================== SEND RESULT ==================== */

        const pdfBytes = await pdf.save();
        const base64Pdf = Buffer.from(pdfBytes).toString("base64");

        res.json({
            pdf_url: `data:application/pdf;base64,${base64Pdf}`
        });

    } catch (err) {
        console.error("PDF generation failed:", err);
        res.status(500).json({ error: err.message });
    }
});




/* ============================================================
   START SERVER
============================================================ */
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});