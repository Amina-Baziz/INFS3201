const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');


let client = undefined
const link = 'mongodb+srv://amina:12amina34@cluster0.t2dor.mongodb.net/';
const dbName = 'project'; 


async function connectDB() {
    const client = new MongoClient(link);
    await client.connect();
    return client.db(dbName);
}

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

async function getUserByEmail(email) {
    const db = await connectDB();
    return await db.collection('UserDetails').findOne({ email });
}

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

async function updateApproval(email) {
    const db = await connectDB();
    await db.collection('UserDetails').updateOne(
        { email },
        { $set: { verified: true } }
    );
}

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

async function storeSession(session) {
    const db = await connectDB();
    await db.collection('SessionDetails').insertOne(session);

}

async function getSession(sessionKey) {
    const db = await connectDB();
    return await db.collection('SessionDetails').findOne({ key: sessionKey });
}

async function deleteSession(sessionKey) {
    const db = await connectDB();
    await db.collection('SessionDetails').deleteOne({ key: sessionKey });
}


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
