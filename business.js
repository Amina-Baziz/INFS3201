const bcrypt = require('bcryptjs');
const persistence = require('./persistence');
const crypto = require('crypto');


/**
 * Registers a new user with the provided details, hashes their password, and generates a verification token
 * @param {string} name - The user's name
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @param {string} description - A brief description of the user
 * @param {string} [role="student"] - The role of the user, defaults to "student"
 * @returns {Promise<Object|boolean>} An object containing the email and verification link if successful, otherwise false
 */
async function registerUser(name, email, password, description, role = "student") {
    if (!password || typeof password !== 'string') {
        return false;
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let verificationToken = crypto.randomBytes(20).toString('hex');
        let newUser = {
            name,
            email,
            passwordHash: hashedPassword,
            description,
            role,
            contact: "",
            degree: "",
            verified: false, 
            verificationToken, 
        };

        await persistence.createRegistration(newUser);

        return {
            email,
            verificationLink: `http://localhost:8000/verify-email?token=${verificationToken}`
        };
    } catch (error) {
        console.error("registerUser error:", error);
        return false;
    }
}


/**
 * Verifies a user by their verification token
 * @param {string} token - The verification token
 * @returns {Promise<boolean>} True if the token is valid and the user is verified, otherwise false
 */
async function verifyUser(token) {
    return await persistence.verifyUserToken(token);
}


/**
 * Authenticates a user by comparing the provided password with the stored password hash
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @returns {Promise<Object|boolean>} The user object if authenticated, otherwise false
 */
async function authenticateUser(email, password) {
    const user = await persistence.getUserByEmail(email); 
    if (!user) return false;

    const isMatch = await bcrypt.compare(password, user.passwordHash); 
    return isMatch ? user : false;
}

/**
 * Creates a new user session and stores it in the database
 * @param {Object} user - The authenticated user object
 * @returns {Promise<string>} The generated session key
 */
async function createSession(user) {
    const sessionKey = crypto.randomUUID();
    let sessionData = {
        key: sessionKey,
        userId: user._id,
        role: user.role,
        created_at: new Date(),
        expiry: new Date(Date.now() + 1000 * 60 * 30) 

    };

    await persistence.storeSession(sessionData);
    return sessionKey;
}

/**
 * Retrieves a user by their email address
 * @param {string} email - The email address of the user
 * @returns {Promise<Object|null>} The user object if found, otherwise null
 */
async function getUserByEmail(email){
    return await persistence.getUserByEmail(email);
}

/**
 * Updates a user's profile information
 * @param {string} email - The user's email address
 * @param {string} contact - The user's updated contact information
 * @param {string} degree - The user's updated degree information
 * @returns {Promise<boolean>} True if the update is successful, otherwise false
 */
async function updateProfile(email, contact, degree) {
    return await persistence.updateProfile(email, contact, degree) 
}

/**
 * delete the session from database
 * @param {string} email - The user's email address
 * @returns {Promise<boolean>} True if the update is successful, otherwise false
 */
async function logoutUser(sessionKey) {
    return await persistence.deleteSession(sessionKey);
}
async function getUserById(userId) {
    return await persistence.getUserById(userId);
}



// _______________________________________________________________________________________________

function addBusinessMinutes(startDate, minutesToAdd) {
    const WORK_START = 9;
    const WORK_END = 17;
    const MINUTES_PER_DAY = (WORK_END - WORK_START) * 60;

    let current = new Date(startDate);

    while (minutesToAdd > 0) {
        let hour = current.getHours();
        let isWeekend = current.getDay() === 0 || current.getDay() === 6;

        // If not within work hours or it's the weekend, move to next work day at 9AM
        if (isWeekend || hour < WORK_START || hour >= WORK_END) {
            current.setDate(current.getDate() + 1);
            current.setHours(WORK_START, 0, 0, 0);
            continue;
        }

        let minutesLeftToday = ((WORK_END - hour) * 60) - current.getMinutes();
        let minutesToAdvance = Math.min(minutesToAdd, minutesLeftToday);

        current.setMinutes(current.getMinutes() + minutesToAdvance);
        minutesToAdd -= minutesToAdvance;
    }

    return current;
}


/**
 * Submits a new student request
 * @param {string} studentEmail - The student's email
 * @param {string} category - The request category
 * @param {string} note - Additional note or message
 * @param {string} semester - The current semester
 * @returns {Promise<boolean>} True if successful, otherwise false
 */
async function submitRequest(studentEmail, category, note, semester) {
    const createdAt = new Date();
    const status = "pending";

    const queueLength = await persistence.countPendingRequests(category);
    const estimatedMinutes = (queueLength + 1) * 15;
    

    const estimatedDate = addBusinessMinutes(createdAt, estimatedMinutes);
    const estimatedProcessingTime = estimatedDate.toLocaleString(); // Human-readable

    const request = {
        studentEmail,
        category,
        note,
        semester,
        status,
        createdAt,
        estimatedProcessingTime
    };

    return await persistence.createRequest(request);
}


/**
 * Retrieves all requests for a given student
 * @param {string} email - The student's email
 * @returns {Promise<Array>} List of requests
 */
async function getStudentRequests(email) {
    return await persistence.getRequestsByStudent(email);
}

/**
 * Cancels a student's request
 * @param {string} requestId - The request ID
 * @returns {Promise<boolean>} True if cancelled, false otherwise
 */
async function cancelStudentRequest(requestId) {
    return await persistence.cancelRequest(requestId);
}

/**
 * Returns number of pending requests for each category
 * @returns {Promise<Array>} Array of { category, count }
 */
async function getQueueSummary() {
    return await persistence.getPendingRequestCountsByCategory();
}
/**
 * Returns all pending requests for a specific category (queue)
 * @param {string} category
 * @returns {Promise<Array>}
 */
async function getQueueRequests(category) {
    return await persistence.getRequestsByCategory(category);
}

/**
 * Updates the request's status and adds admin note
 * @param {string} id - Request ID
 * @param {string} status - "resolved" or "rejected"
 * @param {string} note - Admin note
 * @returns {Promise<boolean>}
 */
async function handleRequest(id, status, note) {
    return await persistence.updateRequestStatus(id, status, note);
}
/**
 * Returns a request by its ID
 * @param {string} id - The request's ObjectId
 * @returns {Promise<Object|null>}
 */
async function getRequestById(id) {
    return await persistence.getRequestById(id);
}

/**
 * Returns one random pending request
 * @returns {Promise<Object|null>}
 */
async function getRandomRequest() {
    return await persistence.getRandomPendingRequest();
}

/**
 * Generates a simple random token using bcrypt
 * @param {string} email - The user's email
 * @returns {string} - A unique token string
 */
function generateToken(email) {
    const raw = email + Date.now() + Math.random();
    return bcrypt.hashSync(raw, 5).replace(/\//g, '_'); // Remove slashes to make it URL-safe
}

/**
 * Sends a password reset link by generating and storing a token
 * @param {string} email - The user's email
 * @returns {Promise<boolean>} True if user found and token set
 */
async function sendResetLink(email) {
    const user = await persistence.getUserByEmail(email);
    if (!user) return false;

    const token = generateToken(email); 
    await persistence.setResetToken(email, token);

    const link = `http://localhost:8000/reset-password?token=${token}`;
    console.log(`Password Reset Link: ${link}`); // Simulated email

    return true;
}

/**
 * Validates a reset token
 */
async function validateResetToken(token) {
    return await persistence.getUserByResetToken(token);
}

/**
 * Resets the user password
 */
async function resetUserPassword(token, newPassword) {
    const user = await persistence.getUserByResetToken(token);
    if (!user) return false;

    const hash = bcrypt.hashSync(newPassword, 10);
    return await persistence.updateUserPassword(user.email, hash);
}


module.exports = {
    registerUser,
    authenticateUser,
    createSession,
    verifyUser,
    getUserByEmail,
    updateProfile,
    logoutUser,
    getUserById,
    // _____________
    submitRequest,
    getStudentRequests,
    cancelStudentRequest,
    getQueueSummary,
    getQueueRequests,
    handleRequest,
    getRequestById,
    getRandomRequest,
    generateToken,
    sendResetLink,
    validateResetToken,
    resetUserPassword
};

