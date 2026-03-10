import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = process.env.VERCEL === '1' || process.env.FIREBASE_CONFIG;

// === JSON File Store (Vercel / Serverless fallback) ===
class JsonStore {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = { users: [], projects: [], assets: [], settings: [] };
        this._load();
    }

    _load() {
        try {
            if (fs.existsSync(this.filePath)) {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            }
        } catch { /* start fresh */ }
    }

    _save() {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 0));
        } catch (e) { console.error('JsonStore save error:', e.message); }
    }

    _tableFor(sql) {
        const lower = sql.toLowerCase();
        if (lower.includes('users')) return 'users';
        if (lower.includes('projects')) return 'projects';
        if (lower.includes('assets')) return 'assets';
        if (lower.includes('settings')) return 'settings';
        return null;
    }

    // Mimic sqlite3 callback API: db.run(sql, params, callback)
    run(sql, params, callback) {
        const cb = typeof params === 'function' ? params : callback;
        const p = Array.isArray(params) ? params : [];
        const lower = sql.toLowerCase().trim();

        try {
            if (lower.startsWith('create table') || lower.startsWith('alter table') || lower.startsWith('pragma')) {
                if (cb) cb(null);
                return this;
            }

            if (lower.startsWith('insert or replace') || lower.startsWith('insert')) {
                const table = this._tableFor(sql);
                if (!table) { if (cb) cb(null); return this; }

                // Extract column names from SQL
                const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
                if (!colMatch) { if (cb) cb(null); return this; }
                const cols = colMatch[1].split(',').map(c => c.trim());

                const row = {};
                cols.forEach((col, i) => { row[col] = p[i] !== undefined ? p[i] : null; });

                // Upsert by primary key (first column)
                const pk = cols[0];
                const idx = this.data[table].findIndex(r => r[pk] === row[pk]);
                if (idx >= 0) {
                    this.data[table][idx] = row;
                } else {
                    this.data[table].push(row);
                }
                this._save();
                if (cb) cb.call({ changes: 1 }, null);
                return this;
            }

            if (lower.startsWith('delete')) {
                const table = this._tableFor(sql);
                if (!table) { if (cb) cb(null); return this; }
                const before = this.data[table].length;
                // Simple WHERE matching
                this.data[table] = this.data[table].filter(r => {
                    return !p.every((val, i) => Object.values(r).includes(val));
                });
                this._save();
                if (cb) cb.call({ changes: before - this.data[table].length }, null);
                return this;
            }

            if (cb) cb(null);
        } catch (e) {
            if (cb) cb(e);
        }
        return this;
    }

    get(sql, params, callback) {
        const cb = typeof params === 'function' ? params : callback;
        const p = Array.isArray(params) ? params : [];
        try {
            const table = this._tableFor(sql);
            if (!table) { if (cb) cb(null, null); return; }
            // Simple WHERE matching by params order
            const row = this.data[table].find(r => {
                return p.every(val => Object.values(r).includes(val));
            });
            if (cb) cb(null, row || null);
        } catch (e) {
            if (cb) cb(e, null);
        }
    }

    all(sql, params, callback) {
        const cb = typeof params === 'function' ? params : callback;
        const p = Array.isArray(params) ? params : [];
        try {
            if (sql.toLowerCase().includes('pragma')) {
                if (cb) cb(null, []);
                return;
            }
            const table = this._tableFor(sql);
            if (!table) { if (cb) cb(null, []); return; }
            let rows = this.data[table];
            if (p.length > 0) {
                rows = rows.filter(r => p.every(val => Object.values(r).includes(val)));
            }
            // Handle ORDER BY updatedAt DESC
            if (sql.toLowerCase().includes('order by updatedat desc')) {
                rows = [...rows].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            }
            if (cb) cb(null, rows);
        } catch (e) {
            if (cb) cb(e, []);
        }
    }

    prepare(sql) {
        const self = this;
        return {
            run(...args) { self.run(sql, args); },
            finalize() {}
        };
    }

    serialize(fn) { if (fn) fn(); }
}

// === Database Selection ===
let db;

if (isServerless) {
    // Vercel: use JSON file store (no native modules needed)
    const storePath = path.join('/tmp', 'nexus-store.json');
    db = new JsonStore(storePath);
    console.log('[DB] Using JsonStore at', storePath);
} else {
    // Local dev: use SQLite
    try {
        const sqlite3 = (await import('sqlite3')).default;
        const dbPath = path.resolve(__dirname, 'nexus.sqlite');
        db = new sqlite3.Database(dbPath);

        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT,
                name TEXT, avatar TEXT, createdAt INTEGER
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY, userId TEXT, name TEXT, thumbnail TEXT,
                thumbnailPosition TEXT, nodes TEXT, edges TEXT, viewport TEXT,
                updatedAt INTEGER, tags TEXT
            )`, (err) => {
                if (!err) {
                    db.all("PRAGMA table_info(projects)", (err, rows) => {
                        if (!rows) return;
                        if (!rows.some(r => r.name === 'userId')) db.run("ALTER TABLE projects ADD COLUMN userId TEXT");
                        if (!rows.some(r => r.name === 'tags')) db.run("ALTER TABLE projects ADD COLUMN tags TEXT");
                        if (!rows.some(r => r.name === 'thumbnailPosition')) db.run("ALTER TABLE projects ADD COLUMN thumbnailPosition TEXT");
                    });
                }
            });
            db.run(`CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY, filename TEXT, path TEXT,
                mimetype TEXT, size INTEGER, createdAt INTEGER
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
        });
        console.log('[DB] Using SQLite at', dbPath);
    } catch (e) {
        // Fallback to JsonStore if sqlite3 fails to load
        console.warn('[DB] SQLite failed, falling back to JsonStore:', e.message);
        const storePath = path.resolve(__dirname, 'nexus-store.json');
        db = new JsonStore(storePath);
    }
}

export default db;
