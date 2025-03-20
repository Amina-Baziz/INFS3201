const express = require('express');
const business = require('./business');
const nodemailer = require('nodemailer');
const path = require('path');
const expressHandlebars = require('express-handlebars');

const app = express();

app.engine('hbs', expressHandlebars.engine({ extname: '.hbs', defaultLayout: 'main' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function logEmailDetails(to, verificationLink) {
    console.log("**Simulated Email Sent**");
    console.log(`To: ${to}`);
    console.log(`Verification Link: ${verificationLink}`);
    console.log("---------------------------------\n");
}

app.get('/', (req, res) => {
    res.render('home', { title: 'Course Management System' });
});


app.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});


app.post('/register', async (req, res) => {
    const { name, email, password, description } = req.body;

    if (!email || !password || !name) {
        return res.render('error', { message: "All fields are required!", link: '/register' });
    }

     const existingUser = await business.getUserByEmail(email);

     if (existingUser) {
         return res.render('error', { message: "This email is already registered. Please login instead.", link: '/login' });
     }


    const userData = await business.registerUser(name, email, password, description);

    if (!userData) {
        return res.render('error', { message: "Registration failed. Email might already be in use.", link: '/register' });
    }

    logEmailDetails(userData.email, userData.verificationLink);

    res.render('success', { message: 'Registration successful! Please check your email for verification.' });
});

app.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.render('error', { message: "Verification Token Missing" });
    }

    const success = await business.verifyUser(token);
    if (success) {
        res.render('success',{message: "Email Verified Successfully! You can now <a href='/login'>login</a>."});
    } else {
        res.render('error', { message: "Invalid or Expired Verification Token" });
    }
});


app.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required!" });
    }

    const user = await business.authenticateUser(email, password);

    if (!user) {
        return res.render('error', { message: "Invalid email or password.", link: '/login' });
    }

    if (!user.verified) {
        return res.render('error', { message: "Please verify your email before logging in!", link: '/' });
    }

    const sessionKey = await business.createSession(user);

    if (user.role === "department_head") {
        res.redirect(`/admin-dashboard?name=${user.name}`);
    } else {
        res.redirect(`/profile/${user.email}`);
    }
});

app.get('/department-head-dashboard', (req, res) => {
    res.render('department-head-dashboard', { title: 'Department Head Dashboard' });
});


app.get('/admin-dashboard', (req, res) => {
    const name = req.query.name;
    res.render('department-head-dashboard', { title: 'Admin Dashboard', name: name });
});


app.get('/student-dashboard', (req, res) => {
    res.render('student-dashboard', { title: 'Student Dashboard' });
}); 

app.get('/profile/:email', async (req, res) => {
    const email = req.params.email;
    const user = await business.getUserByEmail(email);

    if (!user) {
        return res.status(404).render('error', { message: "Profile Not Found" });
    }

    res.render('profile', { title: 'Student Profile', user });
});

app.get('/update-profile-form/:email', async (req, res) => {
    const email = req.params.email;
    const user = await business.getUserByEmail(email);

    if (!user) {
        return res.status(404).render('error', { message: "Profile Not Found" });
    }

    res.render('update-profile', { title: 'Update Profile', email: user.email, contact: user.contact, degree: user.degree });
});


app.post('/update-profile', async (req, res) => {
    const { email, contact, degree } = req.body;

    if (!email || !contact || !degree) {
        return res.render('error', { message: "All fields are required!", link: `/update-profile-form/${email}` });
    }

    const success = await business.updateProfile(email, contact, degree);
    if (success) {
        res.render('success', { message: 'Profile Updated Successfully!' });
    } else {
        res.render('error', { message: "Profile Update Failed", link: `/update-profile-form/${email}` });
    }
});


app.listen(8010, () => {
    console.log("App is running on port 8010");
});
