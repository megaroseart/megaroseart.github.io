const express = require('express');
const app = express();
app.use(express.json());

let users = {}; // In production use a database

app.post('/api/tap', (req, res) => {
    const { userId, taps, totalMined } = req.body;
    if (!users[userId]) users[userId] = { totalMined: 0 };
    users[userId].totalMined = totalMined;
    res.json({ success: true });
});

app.get('/api/leaderboard', (req, res) => {
    let sorted = Object.entries(users).map(([id, data]) => ({ id, totalMined: data.totalMined }));
    sorted.sort((a,b) => b.totalMined - a.totalMined);
    res.json(sorted.slice(0, 50));
});

app.listen(3000, () => console.log('Server running'));
