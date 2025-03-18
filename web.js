const express = require('express');
const business = require('./business');
const persistence = require('./persistence');
const nodemailer = require('nodemailer');
const path = require('path');
<<<<<<< HEAD
const expressHandlebars = require('express-handlebars');
=======
const expressHandlebars = require('express-handlebars'); // Use express-handlebars here
>>>>>>> d14a26ed74ddb238fbccaebf5e75ce8b8d7299dd

const app = express();

// Set up Handlebars properly
<<<<<<< HEAD
app.engine('hbs', expressHandlebars.engine({ extname: '.hbs', defaultLayout: 'main' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
=======
app.engine('handlebars', expressHandlebars.create({ defaultLayout: 'main' }).engine);  // Use expressHandlebars.create()
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views')); // Correct path to your views directory
>>>>>>> d14a26ed74ddb238fbccaebf5e75ce8b8d7299dd

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
<<<<<<< HEAD
app.use(express.static(path.join(__dirname, 'public')));

// Logging Email Details
=======
app.use(express.static(path.join(__dirname, 'public'))); // Serving static files like CSS, JS, etc.

>>>>>>> d14a26ed74ddb238fbccaebf5e75ce8b8d7299dd
function logEmailDetails(email, verificationLink) {
    console.log(`To: ${email}`);
    console.log(`Verification Link: ${verificationLink}`);
    console.log("---------------------------------");
}

<<<<<<< HEAD
// Nodemailer configuration
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "alexray@gmail.com", // Update with real email
        pass: "mockpassword" // Update with real password
=======
// Nodemailer configuration (this is just a mock; replace with real credentials when necessary)
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", // Use a real SMTP server
    port: 587,
    secure: false,
    auth: {
        user: "alexray@gmail.com",
        pass: "mockpassword"  // Use real password or environment variables for sensitive data
>>>>>>> d14a26ed74ddb238fbccaebf5e75ce8b8d7299dd
    }
});

// Home Page
app.get('/', (req, res) => {
<<<<<<< HEAD
    res.render('home', { title: 'Course Management System' });
});

// Registration Form
app.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});

// Registration POST route
app.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: "All fields are required!" });
    }

    const existingUser = await persistence.getUserByEmail(email);

    if (existingUser) {
        return res.render('error', { message: "❌ Email already exists!", link: '/register' });
    }

    // Save the new user (implement this in your persistence file)
    const newUser = await persistence.createUser({ email, password, name });

    // Send a verification email
    const verificationLink = `http://localhost:8008/verify/${newUser.email}`;
    logEmailDetails(newUser.email, verificationLink);

    // Send email (Nodemailer)
    await transporter.sendMail({
        from: '"Course Management System" <alexray@gmail.com>',
        to: newUser.email,
        subject: "Verify your email",
        text: `Click this link to verify your email: ${verificationLink}`,
    });

    res.render('success', { message: 'Registration successful! Please check your email for verification.' });
});

// Login Form
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
=======
    res.render('home', {
        title: 'Course Management System'  // This will replace {{title}} in the template
    });
});

// Registration Form (HTML Page)
app.get('/register-form', (req, res) => {
    res.render('register-form', {
        title: 'Register a New User'
    });
>>>>>>> d14a26ed74ddb238fbccaebf5e75ce8b8d7299dd
});

// Handle Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required!" });
    }

    const user = await persistence.getUserByEmail(email);

    if (!user) {
<<<<<<< HEAD
        return res.render('error', { message: "❌ No account found with this email", link: '/login' });
    }

    if (!user.verified) {
        return res.render('error', { message: "❌ Please verify your email before logging in!", link: '/' });
    }

    const sessionKey = await business.createSession(user);

    if (user.role === "department_head") {
        res.redirect(`/department-head-dashboard?name=${user.name}`);
=======
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
>>>>>>> d14a26ed74ddb238fbccaebf5e75ce8b8d7299dd
    } else {
        res.redirect(`/profile/${user.email}`);
    }
});

<<<<<<< HEAD
// Department Head Dashboard
app.get('/department-head-dashboard', (req, res) => {
    res.render('department-head-dashboard', { title: 'Department Head Dashboard' });
=======
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
>>>>>>> d14a26ed74ddb238fbccaebf5e75ce8b8d7299dd
});

// Admin Dashboard
app.get('/admin-dashboard', (req, res) => {
    const name = req.query.name;
<<<<<<< HEAD
    res.render('admin-dashboard', { title: 'Admin Dashboard', name: name });
=======

    res.render('admin-dashboard', {
        title: 'Admin Dashboard',
        name: name
    });
>>>>>>> d14a26ed74ddb238fbccaebf5e75ce8b8d7299dd
});

// Profile Page
app.get('/profile/:email', async (req, res) => {
    const email = req.params.email;
    const user = await persistence.getUserByEmail(email);

    if (!user) {
<<<<<<< HEAD
        return res.status(404).render('error', { message: "❌ Profile Not Found" });
    }

    res.render('profile', { title: 'Student Profile', user: user });
});

// Student Dashboard
app.get('/student-dashboard', (req, res) => {
    res.render('student-dashboard', { title: 'Student Dashboard' });
});

// New Request Form
app.get('/request/new', (req, res) => {
    res.render('request-new', { title: 'Submit New Request' });
});

// Handle New Request Submission
app.post('/request/new', async (req, res) => {
    const { category, description } = req.body;

    if (!category || !description) {
        return res.status(400).json({ error: "Category and description are required!" });
    }

    // Save the new request (implement this in your persistence file)
    const newRequest = await persistence.createRequest({ category, description });

    res.render('success', { message: 'Your request has been submitted successfully!' });
});

// Success Page
app.get('/success', (req, res) => {
    res.render('success', { message: 'Your request has been submitted successfully!' });
});

// Start the server on port 8000
app.listen(8010, () => {
    console.log("App is running on port 8010");
=======
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
>>>>>>> d14a26ed74ddb238fbccaebf5e75ce8b8d7299dd
});
