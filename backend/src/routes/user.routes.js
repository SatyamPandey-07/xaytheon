const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { verifyAccessToken, generalRateLimiter } = require("../middleware/auth.middleware");
const authorize = require("../middleware/rbacMiddleware");
const { PERMISSIONS } = require("../config/roles");
const authorize = require("../middleware/authorize");
const { ACTIONS } = require("../config/permissions");

router.use(generalRateLimiter);

router.get(
  "/history",
  verifyAccessToken,
  authorize(PERMISSIONS.VIEW_HISTORY),
  authorize(ACTIONS.READ),
  userController.getHistory
);

router.post(
  "/history",
  verifyAccessToken,
  authorize(PERMISSIONS.UPDATE_HISTORY),
  userController.updateHistory
);
  authorize(ACTIONS.UPDATE),
  userController.updateHistory
);

router.get("/preferences", verifyAccessToken, userController.getPreferences);
router.put("/preferences", verifyAccessToken, userController.updatePreferences);

module.exports = router;

