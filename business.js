const bcrypt = require('bcryptjs');
const persistence = require('./persistence');
const crypto = require('crypto');

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


async function verifyUser(token) {
    return await persistence.verifyUserToken(token);
}


async function authenticateUser(email, password) {
    const user = await persistence.getUserByEmail(email); 
    if (!user) return false;

    const isMatch = await bcrypt.compare(password, user.passwordHash); 
    return isMatch ? user : false;
}


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



module.exports = {
    registerUser,
    authenticateUser,
    createSession,
    verifyUser
};
