const jwt = require("jsonwebtoken");

module.exports = function generateToken(user) {
    // user.role should be populated to include roleName
    const roleName = user.role && user.role.roleName ? user.role.roleName : "viewer";
    return jwt.sign(
        { id: user._id.toString(), role: roleName },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};


