const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Hardcoded Admin Credentials (Store hashed password!) ---
const ADMIN_USERNAME = 'admin';
// IMPORTANT: Replace 'yourpassword' with a strong password
// Generate hash (run this once, e.g., in a separate script or online tool):
// const saltRounds = 10;
// bcrypt.hash('yourpassword', saltRounds).then(hash => console.log(hash));
// Example hash for password "password123": $2b$10$abcdefghijklmnopqrstuvwxyzA.BCDEFGHIJKLMNOPQRSTU
// Replace the example hash below with your generated hash
const ADMIN_PASSWORD_HASH = '$2b$10$zZsYIpxp17x0JGpmbmlJPe2tnD9tXgwvT5OtqPwebAWUi9PAS2AWa'; // !!! REPLACE THIS HASH !!!

// --- Database Setup ---
const dbFilePath = path.join(__dirname, 'data.db');
const db = new Database(dbFilePath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS carousel_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_filename TEXT,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS about_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    paragraph1 TEXT,
    paragraph2 TEXT,
    stat_years TEXT,
    stat_projects TEXT,
    stat_team TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Initialize about_content if empty
const checkAbout = db.prepare('SELECT COUNT(*) as count FROM about_content WHERE id = 1');
if (checkAbout.get().count === 0) {
    const insertAbout = db.prepare(`
        INSERT INTO about_content (id, paragraph1, paragraph2, stat_years, stat_projects, stat_team)
        VALUES (1, ?, ?, ?, ?, ?)
    `);
    insertAbout.run(
        '我们是一家致力于提供创新解决方案的公司，拥有专业的团队和丰富的行业经验。', // Default p1
        '我们的使命是通过卓越的服务和创新的技术，帮助客户实现业务增长。',       // Default p2
        '10+',      // Default years
        '100+',     // Default projects
        '50+'       // Default team
    );
    console.log('Initialized default about content.');
}

console.log('Database connected and tables ensured.');

// --- File Upload Setup ---
// Carousel Uploads
const carouselUploadDirectory = path.join(__dirname, 'public', 'uploads', 'carousel');
fs.mkdirSync(carouselUploadDirectory, { recursive: true });
const carouselStorage = multer.diskStorage({
  destination: carouselUploadDirectory,
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'carousel-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const carouselUpload = multer({ storage: carouselStorage });

// Services Uploads
const servicesUploadDirectory = path.join(__dirname, 'public', 'uploads', 'services');
fs.mkdirSync(servicesUploadDirectory, { recursive: true });
const servicesStorage = multer.diskStorage({
  destination: servicesUploadDirectory,
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'service-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const serviceUpload = multer({ storage: servicesStorage });

// Define paths for Express config
const publicDirectoryPath = path.join(__dirname, 'public');

// Setup static directory to serve (including uploads)
app.use(express.static(publicDirectoryPath));
// Middleware to parse JSON bodies and URL-encoded bodies (needed for forms)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: 'key', // IMPORTANT: Change this to a long random string!
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // Example: cookie expires in 24 hours
    }
}));

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next(); // User is logged in, proceed
    } else {
        res.redirect('/admin/login'); // User not logged in, redirect to login
    }
};

// --- API Routes: Carousel ---

// GET all carousel images
app.get('/api/carousel-images', (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, filename FROM carousel_images ORDER BY upload_timestamp DESC');
    const images = stmt.all();
    const imagesWithPath = images.map(img => ({ 
        ...img,
        path: '/uploads/carousel/' + img.filename 
    }));
    res.json(imagesWithPath);
  } catch (err) {
    console.error('Error fetching carousel images:', err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// POST (upload) a new carousel image
app.post('/api/carousel-images', carouselUpload.single('carouselImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
    }
    try {
        const stmt = db.prepare('INSERT INTO carousel_images (filename) VALUES (?)');
        const info = stmt.run(req.file.filename);
        res.status(201).json({ 
            id: info.lastInsertRowid, 
            filename: req.file.filename,
            path: '/uploads/carousel/' + req.file.filename 
        });
    } catch (err) {
        console.error('Error inserting carousel image into database:', err);
        fs.unlink(req.file.path, (unlinkErr) => {
            if (unlinkErr) console.error("Error deleting uploaded file after DB error:", unlinkErr);
        });
        res.status(500).json({ error: 'Failed to save image information' });
    }
});

// DELETE a carousel image
app.delete('/api/carousel-images/:id', (req, res) => {
    const imageId = req.params.id;
    try {
        const getStmt = db.prepare('SELECT filename FROM carousel_images WHERE id = ?');
        const image = getStmt.get(imageId);
        if (!image) return res.status(404).json({ error: 'Image not found' });

        const deleteStmt = db.prepare('DELETE FROM carousel_images WHERE id = ?');
        const info = deleteStmt.run(imageId);

        if (info.changes > 0) {
            const filePath = path.join(carouselUploadDirectory, image.filename);
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting carousel image file:", image.filename, unlinkErr);
                else console.log('Deleted carousel image file:', image.filename);
            });
            res.status(200).json({ message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ error: 'Image not found or already deleted' });
        }
    } catch (err) {
        console.error('Error deleting carousel image:', err);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// --- API Routes: Services ---

// GET all services
app.get('/api/services', (req, res) => {
    try {
        const stmt = db.prepare('SELECT id, title, description, image_filename, display_order FROM services ORDER BY display_order ASC, created_at ASC');
        const services = stmt.all();
        const servicesWithPath = services.map(service => ({
            ...service,
            image_path: service.image_filename ? '/uploads/services/' + service.image_filename : null
        }));
        res.json(servicesWithPath);
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// POST a new service
app.post('/api/services', serviceUpload.single('serviceImage'), (req, res) => {
    const { title, description, display_order } = req.body;
    const image_filename = req.file ? req.file.filename : null;

    if (!title || !description) {
        // Delete uploaded file if validation fails
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Title and description are required' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO services (title, description, image_filename, display_order)
            VALUES (?, ?, ?, ?)
        `);
        const info = stmt.run(title, description, image_filename, display_order || 0);
        res.status(201).json({ 
            id: info.lastInsertRowid, 
            title, 
            description, 
            image_filename, 
            display_order: display_order || 0,
            image_path: image_filename ? '/uploads/services/' + image_filename : null
        });
    } catch (err) {
        console.error('Error inserting service:', err);
        // Delete uploaded file if DB insert fails
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Failed to add service' });
    }
});

// PUT (update) an existing service
app.put('/api/services/:id', serviceUpload.single('serviceImage'), (req, res) => {
    const serviceId = req.params.id;
    const { title, description, display_order, deleteCurrentImage } = req.body;
    let image_filename = null;

    // Find the existing service
    const getStmt = db.prepare('SELECT image_filename FROM services WHERE id = ?');
    const existingService = getStmt.get(serviceId);
    if (!existingService) {
        if (req.file) fs.unlinkSync(req.file.path); // Delete newly uploaded file if service not found
        return res.status(404).json({ error: 'Service not found' });
    }

    let oldFilenameToDelete = null;

    if (req.file) {
        // New image uploaded, replace old one
        image_filename = req.file.filename;
        if (existingService.image_filename) {
            oldFilenameToDelete = existingService.image_filename; // Mark old file for deletion after DB update
        }
    } else if (deleteCurrentImage === 'true' && existingService.image_filename) {
        // Explicitly requested to delete image without uploading new one
        oldFilenameToDelete = existingService.image_filename;
        image_filename = null; // Set filename to null in DB
    } else {
        // Keep the existing image
        image_filename = existingService.image_filename;
    }

    if (!title || !description) {
         if (req.file) fs.unlinkSync(req.file.path); // Delete newly uploaded file if validation fails
        return res.status(400).json({ error: 'Title and description are required' });
    }

    try {
        const stmt = db.prepare(`
            UPDATE services 
            SET title = ?, description = ?, image_filename = ?, display_order = ?
            WHERE id = ?
        `);
        const info = stmt.run(title, description, image_filename, display_order || 0, serviceId);

        if (info.changes > 0) {
            // Delete the old file *after* successful DB update
            if (oldFilenameToDelete) {
                const oldFilePath = path.join(servicesUploadDirectory, oldFilenameToDelete);
                fs.unlink(oldFilePath, (unlinkErr) => {
                     if (unlinkErr) console.error("Error deleting old service image file:", oldFilenameToDelete, unlinkErr);
                     else console.log('Deleted old service image file:', oldFilenameToDelete);
                });
            }
            res.status(200).json({ 
                 id: serviceId, 
                 title, 
                 description, 
                 image_filename, 
                 display_order: display_order || 0,
                 image_path: image_filename ? '/uploads/services/' + image_filename : null
            });
        } else {
            res.status(404).json({ error: 'Service not found or no changes made' });
             // If no changes were made, but a new file was uploaded, delete the new file.
            if (req.file && image_filename === req.file.filename) fs.unlinkSync(req.file.path);
        }
    } catch (err) {
        console.error('Error updating service:', err);
         // If DB update fails, delete the newly uploaded file
        if (req.file && image_filename === req.file.filename) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

// DELETE a service
app.delete('/api/services/:id', (req, res) => {
    const serviceId = req.params.id;
    try {
        // First, get the filename to delete the file
        const getStmt = db.prepare('SELECT image_filename FROM services WHERE id = ?');
        const service = getStmt.get(serviceId);
        
        // Second, delete the record from the database
        const deleteStmt = db.prepare('DELETE FROM services WHERE id = ?');
        const info = deleteStmt.run(serviceId);

        if (info.changes > 0) {
            // Third, delete the associated image file if it exists
            if (service && service.image_filename) {
                const filePath = path.join(servicesUploadDirectory, service.image_filename);
                fs.unlink(filePath, (unlinkErr) => {
                     if (unlinkErr) console.error("Error deleting service image file:", service.image_filename, unlinkErr);
                     else console.log('Deleted service image file:', service.image_filename);
                });
            }
            res.status(200).json({ message: 'Service deleted successfully' });
        } else {
            res.status(404).json({ error: 'Service not found' });
        }
    } catch (err) {
        console.error('Error deleting service:', err);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

// --- API Routes: About --- 

// GET About Content (Publicly accessible)
app.get('/api/about', (req, res) => {
    try {
        const stmt = db.prepare('SELECT paragraph1, paragraph2, stat_years, stat_projects, stat_team FROM about_content WHERE id = 1');
        const content = stmt.get();
        if (content) {
            res.json(content);
        } else {
             // Should not happen if initialization works, but good fallback
            res.status(404).json({ error: 'About content not found' }); 
        }
    } catch (err) {
        console.error('Error fetching about content:', err);
        res.status(500).json({ error: 'Failed to fetch about content' });
    }
});

// PUT Update About Content (Protected)
app.put('/api/about', requireLogin, (req, res) => {
    const { paragraph1, paragraph2, stat_years, stat_projects, stat_team } = req.body;

    // Basic validation
    if (typeof paragraph1 !== 'string' || typeof paragraph2 !== 'string' || 
        typeof stat_years !== 'string' || typeof stat_projects !== 'string' || typeof stat_team !== 'string') {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        const stmt = db.prepare(`
            UPDATE about_content 
            SET paragraph1 = ?, paragraph2 = ?, stat_years = ?, stat_projects = ?, stat_team = ?, last_updated = CURRENT_TIMESTAMP
            WHERE id = 1
        `);
        const info = stmt.run(paragraph1, paragraph2, stat_years, stat_projects, stat_team);
        
        if (info.changes > 0) {
            console.log('About content updated successfully.');
             // Fetch the updated content to return it
            const updatedStmt = db.prepare('SELECT paragraph1, paragraph2, stat_years, stat_projects, stat_team FROM about_content WHERE id = 1');
            const updatedContent = updatedStmt.get();
            res.status(200).json(updatedContent);
        } else {
             // This might happen if the row with id=1 somehow got deleted.
            console.error('Failed to update about content: Row not found or no changes made.');
            res.status(404).json({ error: 'About content not found or no changes applied' });
        }
    } catch (err) {
        console.error('Error updating about content:', err);
        res.status(500).json({ error: 'Failed to update about content' });
    }
});

// --- Authentication Routes ---

// GET Login Page
app.get('/admin/login', (req, res) => {
    // If already logged in, redirect to admin dashboard
    if (req.session && req.session.isAdmin) {
        return res.redirect('/admin'); 
    }
    res.sendFile(path.join(__dirname, 'admin', 'login.html')); // Serve the login page
});

// POST Login Attempt
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME) {
        try {
            // Compare submitted password with the stored hash
            const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
            if (match) {
                // Passwords match - Login successful
                req.session.isAdmin = true; // Set session flag
                console.log('Admin login successful for:', username);
                res.redirect('/admin'); // Redirect to the admin dashboard
            } else {
                // Passwords don't match
                console.log('Admin login failed (wrong password) for:', username);
                // Send back to login page with an error query parameter
                res.redirect('/admin/login?error=1'); 
            }
        } catch (err) {
            console.error('Error during password comparison:', err);
            res.redirect('/admin/login?error=2'); // Server error
        }
    } else {
        // Username doesn't match
        console.log('Admin login failed (wrong username): attempted', username);
        res.redirect('/admin/login?error=1'); // Generic error
    }
});

// GET Logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.redirect('/admin'); // Redirect anyway, maybe show error later
        }
        console.log('Admin logged out');
        res.clearCookie('connect.sid'); // Optional: clear the session cookie
        res.redirect('/admin/login'); // Redirect to login page
    });
});


// --- Protected Admin Panel Routes ---
// Apply requireLogin middleware to all routes starting with /admin (except login/logout)
app.get('/admin', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html')); 
});

app.get('/admin/carousel', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin-carousel.html'));
});

app.get('/admin/services', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin-services.html')); 
});

// Add route for the new about admin page (protected)
app.get('/admin/about', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin-about.html')); // We need to create this file
});

// Serve admin CSS without login (needed for login page)
app.get('/admin/admin-styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin-styles.css'));
});


app.listen(PORT, () => {
    console.log(`Server is up on port ${PORT}`);
}); 
 
