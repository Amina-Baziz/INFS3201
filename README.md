# Course Management System (INFS3102)

A web app where students submit requests to their department and the department head works through them in queues. Built with Node.js, Express, Handlebars and MongoDB for the INFS3102 course project.

## Features

**Students**
- Register with email verification, log in, log out
- Forgot / reset password via a time-limited token (15 minutes)
- View and update profile (contact, degree)
- Submit a request with a category, note and semester
- See an estimated processing time for each request
- Dashboard with all requests, filterable by semester
- Cancel a pending request

**Department head**
- Dashboard showing the number of pending requests per category
- Open a category queue (oldest first) and view request details
- Resolve or reject a request with a note
- Pick a random pending request

**General**
- Session-based auth (session key stored in MongoDB, sent as an HTTP-only cookie)
- Passwords hashed with bcrypt
- CSRF token check on the new-request form
- Emails (verification, password reset, request updates) are simulated and printed to the console

## How the processing time is estimated

Each request is assumed to take 15 minutes. The estimate is `(pending requests in the category + 1) x 15 minutes`, counted in business hours only (Monday to Friday, 9:00 to 17:00).

## Tech stack

- Node.js, Express
- express-handlebars (views in `views/`)
- MongoDB (`mongodb` driver)
- bcryptjs, cookie-parser

## Project structure

```
web.js          Express server and routes
business.js     Business logic (registration, auth, requests, queues)
persistence.js  MongoDB access layer
hashPassword.js Password hashing helper
views/          Handlebars templates (layouts, partials, pages)
public/css/     Stylesheets
static/         Static assets
```

## Getting started

1. Install dependencies:
   ```
   npm install
   ```
2. Set your MongoDB connection string in `persistence.js` (database name: `project`). Do not commit real credentials.
3. Start the server:
   ```
   node web.js
   ```
4. Open http://localhost:8000

## Database collections

| Collection | Purpose |
|---|---|
| `UserDetails` | Users (name, email, passwordHash, role, contact, degree, verified, tokens) |
| `SessionDetails` | Login sessions (key, userId, role, expiry) |
| `Requests` | Student requests (studentEmail, category, note, semester, status, adminNote, createdAt, estimatedProcessingTime) |

## Roles

- `student`: default role for everyone who registers.
- `department_head`: cannot be created from the registration form. Set a user's `role` to `department_head` directly in the `UserDetails` collection.

## Usage notes

- After registering, copy the verification link from the server console and open it to verify the account.
- The same applies to password reset links.

## Routes

| Route | Who | Description |
|---|---|---|
| `/` | Everyone | Home page |
| `/register`, `/login`, `/logout` | Everyone | Account access |
| `/verify-email` | Everyone | Email verification |
| `/forgot-password`, `/reset-password` | Everyone | Password reset |
| `/student-dashboard` | Student | List and filter own requests |
| `/request/new` | Student | Submit a request |
| `/request/cancel/:id` | Student | Cancel a request |
| `/student/request/:id` | Student | View own request |
| `/profile/:email`, `/update-profile-form/:email` | Logged in | View and edit profile |
| `/admin-dashboard` | Department head | Queue summary |
| `/admin/queue/:category` | Department head | Pending requests in a category |
| `/admin/request/:id` | Department head | View and handle a request |
| `/admin/random-request` | Department head | Jump to a random pending request |
