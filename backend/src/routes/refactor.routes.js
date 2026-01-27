const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: "Refactor API is working" });
});

module.exports = router;
