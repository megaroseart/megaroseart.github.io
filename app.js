// Telegram WebApp initialization
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

let user = tg.initDataUnsafe?.user || { id: 123456, username: "Player" };
document.getElementById("username").innerText = user.username || user.first_name || "Miner";

// Game State
let balance = 0;
let totalMined = 0;
let level = 1;
let tapValue = 1;
let energy = 1000;
let maxEnergy = 1000;
let referrals = 0;
let referralBonus = 0;
let dailyTaps = 0;

// Level upgrade cost formula: 100 * level
function getUpgradeCost() {
    return 100 * level;
}

// Update UI
function updateUI() {
    document.getElementById("balance").innerText = Math.floor(balance);
    document.getElementById("totalMined").innerText = Math.floor(totalMined);
    document.getElementById("level").innerText = level;
    document.getElementById("levelBadge").innerHTML = `Lv ${level}`;
    document.getElementById("tapValue").innerText = tapValue;
    document.getElementById("nextLevelCost").innerText = getUpgradeCost();
    document.getElementById("energyText").innerHTML = `${Math.floor(energy)}/${maxEnergy}`;
    let energyPercent = (energy / maxEnergy) * 100;
    document.getElementById("energyFill").style.width = `${energyPercent}%`;
    document.getElementById("referralCount").innerText = referrals;
    document.getElementById("referralBonus").innerText = Math.floor(referralBonus);
    
    // Mission progress
    let tapProgress = Math.min(dailyTaps, 1000);
    document.getElementById("missionTapProgress").innerHTML = `${tapProgress}/1000`;
    let inviteProgress = Math.min(referrals, 1);
    document.getElementById("missionInviteProgress").innerHTML = `${inviteProgress}/1`;
}

// Tap to Mine
function tapMine() {
    if (energy < tapValue) {
        tg.showPopup({ title: "No Energy!", message: "Wait for energy to regenerate", buttons: [{ type: "ok" }] });
        return;
    }
    
    let earned = tapValue;
    balance += earned;
    totalMined += earned;
    energy -= tapValue;
    dailyTaps += tapValue;
    
    // Haptic feedback
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
    
    // Animation
    let btn = document.getElementById("tapButton");
    let ripple = document.createElement("div");
    ripple.className = "ripple";
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
    
    updateUI();
    saveGame();
    checkMissions();
}

// Upgrade Level
function upgradeLevel() {
    let cost = getUpgradeCost();
    if (balance >= cost) {
        balance -= cost;
        level++;
        tapValue = level; // Each level = +1 per tap
        updateUI();
        saveGame();
        tg.showPopup({ title: "Upgraded!", message: `Level ${level} | Now +${tapValue} per tap`, buttons: [{ type: "ok" }] });
    } else {
        tg.showPopup({ title: "Not enough tokens", message: `Need ${cost} tokens`, buttons: [{ type: "ok" }] });
    }
}

// Energy Regeneration
setInterval(() => {
    if (energy < maxEnergy) {
        energy = Math.min(maxEnergy, energy + 5);
        updateUI();
        saveGame();
    }
}, 1000);

// Referral System
function generateReferralLink() {
    let userId = user.id;
    return `https://t.me/YourBotUsername?start=ref_${userId}`;
}

document.getElementById("referralLink").value = generateReferralLink();
document.getElementById("copyLinkBtn").onclick = () => {
    navigator.clipboard.writeText(generateReferralLink());
    tg.showPopup({ title: "Copied!", message: "Share link with friends", buttons: [{ type: "ok" }] });
};

// Missions check
function checkMissions() {
    if (dailyTaps >= 1000) {
        tg.showPopup({ title: "Mission Complete!", message: "You earned 500 bonus tokens!", buttons: [{ type: "ok" }] });
        balance += 500;
        dailyTaps = 0; // Reset daily
        updateUI();
        saveGame();
    }
    if (referrals >= 1) {
        // Already rewarded via referral bonus
        let missionInvite = document.getElementById("missionInviteProgress");
        if (missionInvite.innerText !== "1/1") {
            balance += 200;
            missionInvite.innerText = "1/1";
            updateUI();
            saveGame();
        }
    }
}

// Leaderboard (Mock)
function loadLeaderboard() {
    let leaderboard = [
        { name: "CryptoKing", mined: 25000 },
        { name: "TapMaster", mined: 18200 },
        { name: "MinerPro", mined: 12400 },
        { name: user.username || user.first_name, mined: totalMined }
    ];
    leaderboard.sort((a,b) => b.mined - a.mined);
    let html = "<ol>";
    leaderboard.forEach((u, idx) => {
        let isUser = u.name === (user.username || user.first_name);
        html += `<li style="margin:8px 0; ${isUser ? 'color:#00d4ff' : ''}">
            ${idx+1}. ${u.name} — ${Math.floor(u.mined)} PULSE
        </li>`;
    });
    html += "</ol>";
    document.getElementById("leaderboardList").innerHTML = html;
}

// Save/Load
function saveGame() {
    let save = { balance, totalMined, level, tapValue, energy, maxEnergy, referrals, referralBonus, dailyTaps };
    localStorage.setItem("pulseTapSave", JSON.stringify(save));
}

function loadGame() {
    let saved = localStorage.getItem("pulseTapSave");
    if (saved) {
        let data = JSON.parse(saved);
        balance = data.balance || 0;
        totalMined = data.totalMined || 0;
        level = data.level || 1;
        tapValue = data.tapValue || 1;
        energy = data.energy || 1000;
        maxEnergy = data.maxEnergy || 1000;
        referrals = data.referrals || 0;
        referralBonus = data.referralBonus || 0;
        dailyTaps = data.dailyTaps || 0;
        updateUI();
    }
}

// Tab Switching
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
        if (btn.dataset.tab === "leaderboard") loadLeaderboard();
    };
});

// Events
document.getElementById("tapButton").addEventListener("click", tapMine);
document.getElementById("upgradeBtn").addEventListener("click", upgradeLevel);

// Initial Load
loadGame();
updateUI();
loadLeaderboard();

// Referral detection (from URL)
let urlParams = new URLSearchParams(window.location.search);
let ref = urlParams.get("start") || urlParams.get("ref");
if (ref && ref.startsWith("ref_")) {
    let referrerId = ref.split("_")[1];
    if (referrerId != user.id) {
        referrals++;
        referralBonus += 100;
        balance += 100;
        updateUI();
        saveGame();
        tg.showPopup({ title: "Welcome!", message: "You got 100 free tokens from referral!", buttons: [{ type: "ok" }] });
    }
}
