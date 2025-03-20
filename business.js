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


module.exports = {
    registerUser,
    authenticateUser,
    createSession,
    verifyUser,
    getUserByEmail,
    updateProfile
};
