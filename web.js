const express = require('express');
const business = require('./business');
const persistence = require('./persistence');
const nodemailer = require('nodemailer');
const path = require('path');
const expressHandlebars = require('express-handlebars');

const app = express();

// Set up Handlebars properly
app.engine('hbs', expressHandlebars.engine({ extname: '.hbs', defaultLayout: 'main' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Logging Email Details
function logEmailDetails(email, verificationLink) {
    console.log(`To: ${email}`);
    console.log(`Verification Link: ${verificationLink}`);
    console.log("---------------------------------");
}

// Nodemailer configuration
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "alexray@gmail.com", // Update with real email
        pass: "mockpassword" // Update with real password
    }
});

// Home Page
app.get('/', (req, res) => {
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
});

// Handle Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required!" });
    }

    const user = await persistence.getUserByEmail(email);

    if (!user) {
        return res.render('error', { message: "❌ No account found with this email", link: '/login' });
    }

    if (!user.verified) {
        return res.render('error', { message: "❌ Please verify your email before logging in!", link: '/' });
    }

    const sessionKey = await business.createSession(user);

    if (user.role === "department_head") {
        res.redirect(`/department-head-dashboard?name=${user.name}`);
    } else {
        res.redirect(`/profile/${user.email}`);
    }
});

// Department Head Dashboard
app.get('/department-head-dashboard', (req, res) => {
    res.render('department-head-dashboard', { title: 'Department Head Dashboard' });
});

// Admin Dashboard
app.get('/admin-dashboard', (req, res) => {
    const name = req.query.name;
    res.render('admin-dashboard', { title: 'Admin Dashboard', name: name });
});

// Profile Page
app.get('/profile/:email', async (req, res) => {
    const email = req.params.email;
    const user = await persistence.getUserByEmail(email);

    if (!user) {
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
});
