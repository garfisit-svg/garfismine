import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure database directory and file exist
function initializeDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      profiles: [],
      venues: [],
      venue_resources: [],
      slots: [],
      bookings: [],
      gamingEquipments: [],
      turfDetails: [],
      walkInSessions: [],
      squadProfiles: [],
      squads: [],
      squadMembers: [],
      messages: [],
      polls: [],
      pollVotes: [],
      playerNeededPosts: [],
      playerNeededResponses: [],
      dmThreads: [],
      squadInvites: [],
      squadEvents: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    console.log('Central JSON database initialized.');
  }
}

initializeDb();

// Read current database state
function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading JSON database:', err);
    return {};
  }
}

// Write to database state
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to JSON database:', err);
  }
}

async function startServer() {
  const app = express();

  // Parse JSON bodies with a larger limit to accommodate slot generations and lists
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Endpoints
  app.get('/api/data', (req, res) => {
    const db = readDb();
    res.json({ success: true, data: db });
  });

  app.post('/api/data/update', (req, res) => {
    try {
      const updates = req.body; // e.g. { venues: [...], slots: [...] }
      const db = readDb();

      // Update keys that are passed in
      Object.keys(updates).forEach((key) => {
        if (Array.isArray(updates[key])) {
          db[key] = updates[key];
        } else if (typeof updates[key] === 'object' && updates[key] !== null) {
          db[key] = { ...db[key], ...updates[key] };
        } else {
          db[key] = updates[key];
        }
      });

      writeDb(db);
      res.json({ success: true, message: 'Database updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/data/reset', (req, res) => {
    try {
      const initialData = {
        profiles: [],
        venues: [],
        venue_resources: [],
        slots: [],
        bookings: [],
        gamingEquipments: [],
        turfDetails: [],
        walkInSessions: [],
        squadProfiles: [],
        squads: [],
        squadMembers: [],
        messages: [],
        polls: [],
        pollVotes: [],
        playerNeededPosts: [],
        playerNeededResponses: [],
        dmThreads: [],
        squadInvites: [],
        squadEvents: []
      };
      writeDb(initialData);
      res.json({ success: true, message: 'Database reset successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve static assets or mount Vite dev server based on environment
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in DEVELOPMENT mode. Mounting Vite Dev Server...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION mode. Serving static files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Full-stack central server is running on http://localhost:${PORT}`);
  });
}

startServer();
