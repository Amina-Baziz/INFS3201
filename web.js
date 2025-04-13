const express = require('express');
const business = require('./business');
const nodemailer = require('nodemailer');
const path = require('path');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');

const app = express();

// Set up session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Set up Handlebars with the 'eq' helper
const hbs = expressHandlebars.create({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        eq: function (a, b) {
            return a === b;
        }
    }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendors', express.static(path.join(__dirname, 'public/vendors')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));

function logEmailDetails(to, verificationLink) {
    console.log("**Simulated Email Sent**");
    console.log(`To: ${to}`);
    console.log(`Verification Link: ${verificationLink}`);
    console.log("---------------------------------\n");
}

// Middleware to pass user session data to views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.get('/', (req, res) => {
    res.render('home', { title: 'Course Management System', fullPageLayout: true });
});

app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect(`/profile/${req.session.user.email}`);
    }
    res.render('register', { title: 'Register', fullPageLayout: true });
});

app.post('/register', async (req, res) => {
    const { name, email, password, description } = req.body;

    if (!email || !password || !name) {
        return res.render('error', { message: "All fields are required!", link: '/register', fullPageLayout: true });
    }

    const existingUser = await business.getUserByEmail(email);

    if (existingUser) {
        return res.render('error', { message: "This email is already registered. Please login instead.", link: '/login', fullPageLayout: true });
    }

    const userData = await business.registerUser(name, email, password, description);

    if (!userData) {
        return res.render('error', { message: "Registration failed. Email might already be in use.", link: '/register', fullPageLayout: true });
    }

    logEmailDetails(userData.email, userData.verificationLink);

    res.render('success', { message: 'Registration successful! Please check your email for verification.', fullPageLayout: true });
});

app.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.render('error', { message: "Verification Token Missing", fullPageLayout: true });
    }

    const success = await business.verifyUser(token);
    if (success) {
        res.render('success', { message: "Email Verified Successfully! You can now <a href='/login'>login</a>.", fullPageLayout: true });
    } else {
        res.render('error', { message: "Invalid or Expired Verification Token", fullPageLayout: true });
    }
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect(`/profile/${req.session.user.email}`);
    }
    res.render('login', { title: 'Login', fullPageLayout: true });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required!" });
    }

    const user = await business.authenticateUser(email, password);

    if (!user) {
        return res.render('error', { message: "Invalid email or password.", link: '/login', fullPageLayout: true });
    }

    if (!user.verified) {
        return res.render('error', { message: "Please verify your email before logging in!", link: '/', fullPageLayout: true });
    }

    req.session.user = user;
    req.session.sessionKey = await business.createSession(user);

    if (user.role === "department_head") {
        res.redirect(`/admin-dashboard?name=${user.name}`);
    } else {
        res.redirect(`/student-dashboard`);
    }
});

app.get('/forgot-password', (req, res) => {
    if (req.session.user) {
        return res.redirect(`/profile/${req.session.user.email}`);
    }
    res.render('forgot-password', { title: 'Forgot Password', fullPageLayout: true });
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.render('error', { message: "Email is required!", link: '/forgot-password', fullPageLayout: true });
    }

    const user = await business.getUserByEmail(email);

    if (!user) {
        return res.render('error', { message: "No account found with this email.", link: '/forgot-password', fullPageLayout: true });
    }

    // Simulate generating a password reset token (in a real app, store this in the DB and send via email)
    const resetToken = `http://localhost:8000/reset-password?token=${Buffer.from(email).toString('base64')}`;
    logEmailDetails(email, resetToken);

    res.render('success', { message: 'Password reset link sent! Please check your email.', fullPageLayout: true });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/department-head-dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== "department_head") {
        return res.redirect('/login');
    }
    res.render('department-head-dashboard', { title: 'Department Head Dashboard' });
});

app.get('/admin-dashboard', async (req, res) => {
    if (!req.session.user || req.session.user.role !== "department_head") {
        return res.redirect('/login');
    }
    const name = req.query.name || req.session.user.name || 'Admin';
    const queues = await business.getQueueSummary();
    res.render('department-head-dashboard', { title: 'Admin Dashboard', name, queues });
});

app.get('/student-dashboard', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const email = req.session.user.email;
    const requests = await business.getStudentRequests(email);
    res.render('student-dashboard', { title: 'Student Dashboard', requests });
});

app.get('/profile/:email', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const email = req.params.email;
    const user = await business.getUserByEmail(email);

    if (!user) {
        return res.status(404).render('error', { message: "Profile Not Found", fullPageLayout: true });
    }

    res.render('profile', { title: 'Student Profile', user });
});

app.get('/update-profile-form/:email', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const email = req.params.email;
    const user = await business.getUserByEmail(email);

    if (!user) {
        return res.status(404).render('error', { message: "Profile Not Found", fullPageLayout: true });
    }

    res.render('update-profile', { title: 'Update Profile', email: user.email, contact: user.contact, degree: user.degree });
});

app.post('/update-profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const { email, contact, degree } = req.body;

    if (!email || !contact || !degree) {
        return res.render('error', { message: "All fields are required!", link: `/update-profile-form/${email}`, fullPageLayout: true });
    }

    const success = await business.updateProfile(email, contact, degree);
    if (success) {
        res.render('success', { message: 'Profile Updated Successfully!', fullPageLayout: true });
    } else {
        res.render('error', { message: "Profile Update Failed", link: `/update-profile-form/${email}`, fullPageLayout: true });
    }
});

app.get('/request/new', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('request-new', { title: 'Submit New Request' });
});

app.post('/request/new', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const { category, note, semester } = req.body;
    const studentEmail = req.session.user.email;
    const success = await business.submitRequest(studentEmail, category, note, semester);
    if (success) {
        res.redirect('/student-dashboard');
    } else {
        res.render('error', { message: 'Failed to submit request.', link: '/request/new', fullPageLayout: true });
    }
});

app.listen(8000, () => {
    console.log("App is running on port 8000");
});