const express = require('express');
const business = require('./business');
const persistence = require('./persistence');
const nodemailer = require('nodemailer');
const path = require('path');
const expressHandlebars = require('express-handlebars'); // Use express-handlebars here

const app = express();

// Set up Handlebars properly
app.engine('handlebars', expressHandlebars.create({ defaultLayout: 'main' }).engine);  // Use expressHandlebars.create()
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views')); // Correct path to your views directory

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serving static files like CSS, JS, etc.

function logEmailDetails(email, verificationLink) {
    console.log(`To: ${email}`);
    console.log(`Verification Link: ${verificationLink}`);
    console.log("---------------------------------");
}

// Nodemailer configuration (this is just a mock; replace with real credentials when necessary)
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", // Use a real SMTP server
    port: 587,
    secure: false,
    auth: {
        user: "alexray@gmail.com",
        pass: "mockpassword"  // Use real password or environment variables for sensitive data
    }
});

// Home Page
app.get('/', (req, res) => {
    res.render('home', {
        title: 'Course Management System'  // This will replace {{title}} in the template
    });
});

// Registration Form (HTML Page)
app.get('/register-form', (req, res) => {
    res.render('register-form', {
        title: 'Register a New User'
    });
});

// Handle Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required!" });
    }

    const user = await persistence.getUserByEmail(email);

    if (!user) {
        return res.render('error', {
            message: "❌ No account found with this email",
            link: '/login-form'
        });
    }

    if (!user.verified) {
        return res.render('error', {
            message: "❌ Please verify your email before logging in!",
            link: '/'
        });
    }

    // Create session only after successful login
    const sessionKey = await business.createSession(user);

    // Redirect based on role
    if (user.role === "department_head") {
        res.redirect(`/admin-dashboard?name=${user.name}`);
    } else {
        res.redirect(`/profile/${user.email}`);
    }
});

// Login Form (HTML Page)
app.get('/login-form', (req, res) => {
    res.render('login-form', {
        title: 'Login'
    });
});

// Student Dashboard
app.get('/student-dashboard', (req, res) => {
    const email = req.query.email;

    res.render('student-dashboard', {
        title: 'Student Dashboard',
        email: email
    });
});

// Admin Dashboard
app.get('/admin-dashboard', (req, res) => {
    const name = req.query.name;

    res.render('admin-dashboard', {
        title: 'Admin Dashboard',
        name: name
    });
});

// Profile Page
app.get('/profile/:email', async (req, res) => {
    const email = req.params.email;
    const user = await persistence.getUserByEmail(email);

    if (!user) {
        return res.status(404).render('error', {
            message: "❌ Profile Not Found"
        });
    }

    res.render('profile', {
        title: 'Student Profile',
        user: user
    });
});

// Profile Update Form
app.get('/update-profile-form/:email', (req, res) => {
    const email = req.params.email;

    res.render('update-profile-form', {
        title: 'Update Profile',
        email: email
    });
});

// Handle Profile Update
app.post('/update-profile', async (req, res) => {
    const { email, contact, degree } = req.body;

    if (!email || !contact || !degree) {
        return res.status(400).json({ error: "All fields (email, contact, degree) are required!" });
    }

    const success = await persistence.updateProfile(email, contact, degree);
    if (success) {
        res.render('success', {
            message: '✅ Profile Updated!',
            link: `/profile/${email}`
        });
    } else {
        res.render('error', {
            message: '❌ Profile Update Failed',
            link: `/update-profile-form/${email}`
        });
    }
});

// Verify Email
app.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).render('error', {
            message: '❌ Verification Token Missing'
        });
    }

    const success = await business.verifyUser(token);
    if (success) {
        res.render('success', {
            message: "✅ Email Verified Successfully! You can now <a href='/login-form'>login</a>."
        });
    } else {
        res.render('error', {
            message: "❌ Invalid or Expired Verification Token"
        });
    }
});

// Start the server on port 8005
app.listen(8005, () => {
    console.log("App is running on port 8005");
});
