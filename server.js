const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database.js');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json()); // lets us read JSON sent from the frontend
app.use(express.static('public')); // serves our frontend files
app.use(session({
  secret: 'burnout-tracker-secret-key', // used to secure session data
  resave: false,
  saveUninitialized: false
}));

// Test route - just to check the server works
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});
const bcrypt = require('bcrypt');

// SIGNUP
app.post('/api/signup', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).json({ error: 'Error hashing password' });

    db.run(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        res.json({ message: 'Signup successful', userId: this.lastID });
      }
    );
  });
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    bcrypt.compare(password, user.password, (err, match) => {
      if (!match) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      req.session.userId = user.id; // remember this user is logged in
      res.json({ message: 'Login successful' });
    });
  });
});

// LOGOUT
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});
// Middleware to check if user is logged in
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

// SAVE a new entry
app.post('/api/entries', requireLogin, (req, res) => {
  const { sleep_hours, study_hours, mood } = req.body;
  const date = new Date().toISOString().split('T')[0]; // today's date, e.g. "2026-07-01"

  db.run(
    'INSERT INTO entries (user_id, date, sleep_hours, study_hours, mood) VALUES (?, ?, ?, ?, ?)',
    [req.session.userId, date, sleep_hours, study_hours, mood],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to save entry' });
      res.json({ message: 'Entry saved', id: this.lastID });
    }
  );
});

// GET all entries for logged-in user
app.get('/api/entries', requireLogin, (req, res) => {
  db.all(
    'SELECT * FROM entries WHERE user_id = ? ORDER BY date ASC',
    [req.session.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch entries' });
      res.json(rows);
    }
  );
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});