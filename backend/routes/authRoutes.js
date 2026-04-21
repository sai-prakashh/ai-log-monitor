const express = require("express");
const router  = express.Router();

const { register, login } = require("../controllers/authController");
const { authLimiter }     = require("../middleware/rateLimiter");

// authLimiter: 10 attempts / 15 min per IP
router.post("/register", authLimiter, register);
router.post("/login",    authLimiter, login);

module.exports = router;