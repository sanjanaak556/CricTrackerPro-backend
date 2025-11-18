const UserRole = require("../models/UserRole");

exports.createRole = async (req, res) => {
  try {
    const role = new UserRole({ roleName: req.body.roleName });
    await role.save();
    res.status(201).json({ message: "Role created", role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await UserRole.find();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

