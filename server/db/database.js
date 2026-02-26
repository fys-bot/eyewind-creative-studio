import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure db directory exists
// Vercel and Firebase only allow writing to /tmp
const isServerless = process.env.VERCEL === '1' || process.env.FIREBASE_CONFIG;
const dbPath = isServerless 
    ? path.join('/tmp', 'nexus.sqlite') 
    : path.resolve(__dirname, 'nexus.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 1. Users Table (New)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    avatar TEXT,
    createdAt INTEGER
  )`);

  // 2. Projects Table
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    userId TEXT,
    name TEXT,
    thumbnail TEXT,
    thumbnailPosition TEXT,
    nodes TEXT,
    edges TEXT,
    viewport TEXT,
    updatedAt INTEGER,
    tags TEXT
  )`, (err) => {
      // Migration: Add userId if not exists (for existing dbs)
      if (!err) {
          db.all("PRAGMA table_info(projects)", (err, rows) => {
              const hasUserId = rows.some(r => r.name === 'userId');
              if (!hasUserId) {
                  db.run("ALTER TABLE projects ADD COLUMN userId TEXT");
              }
              const hasTags = rows.some(r => r.name === 'tags');
              if (!hasTags) {
                  db.run("ALTER TABLE projects ADD COLUMN tags TEXT");
              }
              const hasThumbPos = rows.some(r => r.name === 'thumbnailPosition');
              if (!hasThumbPos) {
                  db.run("ALTER TABLE projects ADD COLUMN thumbnailPosition TEXT");
              }
          });
      }
  });

  // 3. Assets Table (For file tracking)
  db.run(`CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    filename TEXT,
    path TEXT,
    mimetype TEXT,
    size INTEGER,
    createdAt INTEGER
  )`);

  // 3. User Settings (Single row usually, or keyed)
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
});

export default db;
