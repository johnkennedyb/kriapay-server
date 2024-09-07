const { Router } = require("express");
const { appUserCheck } = require("../middleware/authMiddleware");
const { Notification } = require("../models/notification");

const router = Router();

router.get("/get-user-notifications", appUserCheck, async (req, res) => {
  const userId = req.userId;
  try {
    const notifications = await Notification.find({ user_id: userId }).sort({createdAt:-1}).limit(
      30
    );
    res.status(200).json({ success: notifications });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/notification/:notifId", appUserCheck, async (req, res) => {
  const userId = req.userId;
  const notifId = req.params.notifId;

  try {
    const notification = await Notification.findOneAndUpdate(
      { user_id: userId, _id: notifId },
      { $set: { status: "read" } }
    );
    res.status(200).json({success:notification})
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
