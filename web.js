const express = require('express');
const business = require('./business');
const nodemailer = require('nodemailer');
const path = require('path');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');

const cookieParser = require('cookie-parser');


const app = express();

app.use(cookieParser());
const crypto = require('crypto');
app.use((req, res, next) => {
  if (!req.cookies.csrfToken) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', token, { httpOnly: false });
  }
  next();
});



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

    res.render('success', { message: 'Registration successful! Please check your email for verification.', fullPageLayout: true, user: req.session.user });
});

app.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.render('error', { message: "Verification Token Missing", fullPageLayout: true });
    }

    const success = await business.verifyUser(token);
    if (success) {
        res.render('success', { message: "Email Verified Successfully! You can now <a href='/login'>login</a>.", fullPageLayout: true, user: req.session.user });
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


app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ___________________________________________________________________________________________________

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

app.get('/admin/queue/:category', async (req, res) => {
    if (!req.session.user || req.session.user.role !== "department_head") {
        return res.redirect('/login');
    }

    const category = req.params.category;
    const requests = await business.getQueueRequests(category);

    res.render('queue-requests', {
        title: `Queue for ${category}`,
        category,
        requests
    });
});

app.get('/admin/request/:id', async (req, res) => {
    if (!req.session.user || req.session.user.role !== "department_head") {
        return res.redirect('/login');
    }

    const requestId = req.params.id;
    const request = await business.getRequestById(requestId);

    if (!request) {
        return res.render('error', { message: "Request not found", fullPageLayout: true });
    }

    res.render('request-details', {
        title: 'Request Details',
        request,
        user: req.session.user  
      });
      
});

app.post('/admin/request/:id', async (req, res) => {
    if (!req.session.user || req.session.user.role !== "department_head") {
        return res.redirect('/login');
    }

    const { note, status } = req.body;
    const requestId = req.params.id;

    const request = await business.getRequestById(requestId);
    if (!request) {
        return res.render('error', {
            message: "Request not found.",
            link: "/admin-dashboard",
            fullPageLayout: true
        });
    }

    const success = await business.handleRequest(requestId, status, note);

    if (success) {
        // Simulate sending email
        console.log("=== EMAIL SENT ===");
        console.log(`To: ${request.studentEmail}`);
        console.log(`Subject: Your request has been ${status}`);
        console.log(`Message: ${note}`);
        console.log("==================");

        res.redirect('/admin-dashboard');
    } else {
        res.render('error', {
            message: "Failed to update request.",
            link: `/admin/request/${requestId}`,
            fullPageLayout: true,
        });
    }
});


app.get('/student/request/:id', async (req, res) => {
    if (!req.session.user || req.session.user.role !== "student") {
        return res.redirect('/login');
    }

    const requestId = req.params.id;
    const request = await business.getRequestById(requestId);

    if (!request || request.studentEmail !== req.session.user.email) {
        return res.render('error', {
            message: "Request not found or access denied.",
            link: '/student-dashboard',
            fullPageLayout: true
        });
    }

    res.render('request-details', {
        title: 'Request Details',
        request,
        user: req.session.user  
    });
});

app.get('/admin/random-request', async (req, res) => {
    if (!req.session.user || req.session.user.role !== "department_head") {
        return res.redirect('/login');
    }

    const randomRequest = await business.getRandomRequest();

    if (!randomRequest) {
        return res.send("<script>alert('Error fetching random request.'); window.location.href='/admin-dashboard';</script>");
    }

    res.redirect(`/admin/request/${randomRequest._id}`);
});


app.get('/student-dashboard', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const email = req.session.user.email;
    const allRequests = await business.getStudentRequests(email);

    // Extract unique, non-empty semesters and sort them
    const semestersSet = new Set();
    allRequests.forEach(req => {
        if (req.semester) semestersSet.add(req.semester);
    });
    const semesters = Array.from(semestersSet).sort();

    const selectedSemester = req.query.semester;

    let filtered = allRequests;
    if (selectedSemester && selectedSemester !== 'all') {
        filtered = allRequests.filter(r => r.semester === selectedSemester);
    }

    res.render('student-dashboard', {
        title: 'Student Dashboard',
        requests: filtered,
        semesters,             
        selectedSemester,      
        user: req.session.user
    });
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

app.post('/request/cancel/:id', async (req, res) => {
    if (!req.session.user || req.session.user.role !== "student") {
        return res.redirect('/login');
    }

    const requestId = req.params.id;
    const success = await business.cancelStudentRequest(requestId);

    if (success) {
        res.redirect('/student-dashboard');
    } else {
        res.render('error', {
            message: "Failed to cancel request.",
            link: '/student-dashboard',
            fullPageLayout: true
        });
    }
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
        res.render('success', {
            message: 'Profile Updated Successfully!',
            fullPageLayout: true,
            user: req.session.user
          });
          
    } 
    
    else {
        res.render('error', { message: "Profile Update Failed", link: `/update-profile-form/${email}`, fullPageLayout: true });
    }
});

app.get('/request/new', (req, res) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
  
    res.render('request-new', {
      title: 'Submit New Request',
      csrfToken: req.cookies.csrfToken 
    });
  });
  

  app.post('/request/new', async (req, res) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
  
    const formToken = req.body.csrfToken;
    const cookieToken = req.cookies.csrfToken;
  
    if (!formToken || !cookieToken || formToken !== cookieToken) {
      return res.status(403).render('error', {
        message: 'CSRF token validation failed!',
        link: '/',
        fullPageLayout: true
      });
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