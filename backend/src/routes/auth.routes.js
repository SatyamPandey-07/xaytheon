const express = require("express");
const router = express.Router();

const controller = require("../controllers/auth.controller");
const { verifyAccessToken, loginRateLimiter } = require("../middleware/auth.middleware");

router.post("/register", controller.register);
router.post("/login", loginRateLimiter, controller.login);
router.get("/github", controller.initiateGithubLogin);
router.get("/github/callback", controller.githubCallback);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/verify", verifyAccessToken, controller.verifyToken);
router.post("/forgot-password", loginRateLimiter, controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.get("/validate-reset-token", controller.validateResetToken);

module.exports = router;
