const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');


let client = undefined
const link = 'mongodb+srv://amina:12amina34@cluster0.t2dor.mongodb.net/';
const dbName = 'project'; 

/**
 * Establishes a connection to the MongoDB database
 * @returns {Promise<Db>} A promise that resolves to the connected database instance
 */
async function connectDB() {
    const client = new MongoClient(link);
    await client.connect();
    return client.db(dbName);
}
/**
 * Validates user credentials by checking if an email exists in the database and returns the user if found
 * @param {string} email - The email address of the user
 * @returns {Promise<Object|boolean>} The user object if found, otherwise false
 */
async function validateCredentials(email) {
    const db = await connectDB();
    const user = await db.collection('UserDetails').findOne({ email });

    if (!user) {
        console.error(`No user found for email: ${email}`);
        return false; 
    }

    if (!user.passwordHash) {
        console.error(`User ${email} has no passwordHash field!`);
        return false;
    }
    return user;
}


/**
 * Registers a new user by inserting their data into the database
 * @param {Object} user - The user data to be inserted
 * @returns {Promise<boolean>} True if insertion is successful, otherwise false
 */
async function createRegistration(user) {
    try {
        const db = await connectDB();
        const result = await db.collection('UserDetails').insertOne(user);
        
        if (result.acknowledged && result.insertedId) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error("MongoDB Insert Error:", error);
        return false;
    }
}

/**
 * Retrieves a user document by their email address
 * @param {string} email - The email address of the user to retrieve
 * @returns {Promise<Object|null>} The user object if found, otherwise null
 */
async function getUserByEmail(email) {
    const db = await connectDB();
    return await db.collection('UserDetails').findOne({ email });
}

/**
 * Updates a user's profile information in the database
 * @param {string} email - The email address of the user to update
 * @param {string} contact - The updated contact information
 * @param {string} degree - The updated degree information
 * @returns {Promise<boolean>} True if update is successful, otherwise false
 */
async function updateProfile(email, contact, degree) {
    try {
        const db = await connectDB();
        const result = await db.collection('UserDetails').updateOne(
            { email: email },
            { $set: { contact: contact, degree: degree } }
        );

        if (result.modifiedCount > 0) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}


/**
 * Marks a user as verified in the database
 * @param {string} email - The email address of the user to update
 * @returns {Promise<void>}
 */
async function updateApproval(email) {
    const db = await connectDB();
    await db.collection('UserDetails').updateOne(
        { email },
        { $set: { verified: true } }
    );
}

/**
 * Updates or creates a user session in the database
 * @param {Object} sd - The session data object containing key, data, and expiry
 * @returns {Promise<void>}
 */
async function updateSession(sd) {
    const db = await connectDB();

    await db.collection('SessionDetails').deleteMany({
        expires_at: { $lt: new Date() }
    });

    const existingSession = await db.collection('SessionDetails').findOne({ key: sd.key });
    if (existingSession) {
        await db.collection('SessionDetails').updateOne(
            { key: sd.key },
            { $set: { data: sd.data, expires_at: new Date(sd.expiry) } }
        );
    } else {
        await db.collection('SessionDetails').insertOne({
            key: sd.key,
            data: sd.data,
            expires_at: new Date(sd.expiry)
        });
    }
}

/**
 * Stores a user session in the database
 * @param {Object} session - The session object to be stored
 * @returns {Promise<void>}
 */
async function storeSession(session) {
    const db = await connectDB();
    await db.collection('SessionDetails').insertOne(session);

}

/**
 * Retrieves a user session by its key
 * @param {string} sessionKey - The session key to look up
 * @returns {Promise<Object|null>} The session object if found, otherwise null
 */
async function getSession(sessionKey) {
    const db = await connectDB();
    return await db.collection('SessionDetails').findOne({ key: sessionKey });
}
/**
 * Deletes a user session by its key
 * @param {string} sessionKey - The session key to delete
 * @returns {Promise<void>}
 */
async function deleteSession(sessionKey) {
    const db = await connectDB();
    await db.collection('SessionDetails').deleteOne({ key: sessionKey });
}


/**
 * Verifies a user's token and marks them as verified if valid
 * @param {string} token - The verification token to check
 * @returns {Promise<boolean>} True if the token is valid and user is verified, otherwise false
 */
async function verifyUserToken(token) {
    try {
        const db = await connectDB();
        const user = await db.collection('UserDetails').findOne({ verificationToken: token });

        if (!user) {
            return false;
        }
        await db.collection('UserDetails').updateOne(
            { verificationToken: token },
            { $set: { verified: true }, $unset: { verificationToken: "" } }
        );

        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    validateCredentials,
    createRegistration,
    updateApproval,
    updateSession,
    getSession,
    deleteSession,
    getUserByEmail,
    updateProfile,
    verifyUserToken,
    storeSession
};
