const bcrypt = require('bcryptjs');

const password = "web2project"; 
const hashedPassword = bcrypt.hashSync(password, 10);

console.log("hashed password for admin in MongoDB:");
console.log(hashedPassword);
