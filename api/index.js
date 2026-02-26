import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../server/db/database.js';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3008;
const JWT_SECRET = process.env.JWT_SECRET || 'nexus-secret-key-change-this';

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for dev simplicity
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use('/uploads', express.static(path.join(process.cwd(), 'server/uploads')));

// --- Multer Storage Config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Vercel and Firebase only allow /tmp
    const uploadDir = (process.env.VERCEL || process.env.FIREBASE_CONFIG) ? '/tmp/uploads' : path.join(process.cwd(), 'server/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---

// 1. Auth APIs
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    // Check existing
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: "User already exists" });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const now = Date.now();
        const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || email}`;

        db.run(`INSERT INTO users (id, email, password, name, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, email, hashedPassword, name || email.split('@')[0], defaultAvatar, now],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Generate Token
                const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ 
                    token, 
                    user: { id: userId, email, name: name || email.split('@')[0], avatar: defaultAvatar, credits: 100, plan: 'free' } 
                });
            }
        );
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: "User not found" });

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ 
                token, 
                user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, credits: 100, plan: 'free' } 
            });
        } else {
            res.status(400).json({ error: "Invalid password" });
        }
    });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get("SELECT id, email, name, avatar FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.sendStatus(404);
        res.json({ ...user, credits: 100, plan: 'free' });
    });
});

// 2. Projects CRUD (Protected)
app.get('/api/projects', authenticateToken, (req, res) => {
  db.all("SELECT * FROM projects WHERE userId = ? ORDER BY updatedAt DESC", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const projects = rows.map(p => ({
        ...p,
        nodes: JSON.parse(p.nodes),
        edges: JSON.parse(p.edges),
        viewport: JSON.parse(p.viewport || '{}'),
        tags: p.tags ? JSON.parse(p.tags) : [],
        thumbnailPosition: p.thumbnailPosition || null
    }));
    res.json(projects);
  });
});

app.post('/api/projects', authenticateToken, (req, res) => {
  const { id, name, thumbnail, thumbnailPosition, nodes, edges, viewport, updatedAt, tags } = req.body;
  const projectId = id || uuidv4();
  const ts = updatedAt || Date.now();

  const sql = `INSERT OR REPLACE INTO projects (id, userId, name, thumbnail, thumbnailPosition, nodes, edges, viewport, updatedAt, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
      projectId, 
      req.user.id,
      name, 
      thumbnail, 
      thumbnailPosition,
      JSON.stringify(nodes), 
      JSON.stringify(edges), 
      JSON.stringify(viewport), 
      ts,
      JSON.stringify(tags || [])
  ];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: projectId, status: 'saved' });
  });
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    // Ensure user owns the project
    db.run("DELETE FROM projects WHERE id = ? AND userId = ?", [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Project not found or unauthorized" });
        res.json({ status: 'deleted' });
    });
});

// 3. Asset Upload (Protected)
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const fileUrl = `/uploads/${req.file.filename}`;
    const assetId = uuidv4();
    
    db.run(`INSERT INTO assets (id, filename, path, mimetype, size, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [assetId, req.file.filename, fileUrl, req.file.mimetype, req.file.size, Date.now()],
        (err) => {
            if (err) console.error("Asset DB Error", err);
        }
    );

    res.json({ 
        url: `http://localhost:${PORT}${fileUrl}`, 
        filename: req.file.filename,
        mimetype: req.file.mimetype
    });
});

// 4. Settings (Public for now, or per user?)
// Let's make it per user if logged in, but keep simple for now.
app.get('/api/settings', (req, res) => {
    db.all("SELECT * FROM settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

app.post('/api/settings', authenticateToken, (req, res) => {
    const settings = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    
    Object.entries(settings).forEach(([key, value]) => {
        stmt.run(key, String(value));
    });
    
    stmt.finalize();
    res.json({ status: 'updated' });
});

// Export app for Vercel
export default app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
}