module.exports = (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    //  both scorer and admin can do scoring actions
    if (req.user.role !== "scorer" && req.user.role !== "admin") {
        return res.status(403).json({ message: "Scorer or Admin only" });
    }
    next();
};
