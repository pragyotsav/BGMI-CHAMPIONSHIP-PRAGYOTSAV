import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
/* 
=========================================
FIREBASE CONFIGURATION
Replace with your actual Firebase config
=========================================
*/
const firebaseConfig = {
  apiKey: "AIzaSyD4pj9OC1VF0hI2Q7Te0_vQ3lpkVggrT9c",
  authDomain: "bgmi-techfest.firebaseapp.com",
  projectId: "bgmi-techfest",
  storageBucket: "bgmi-techfest.firebasestorage.app",
  messagingSenderId: "301716950631",
  appId: "1:301716950631:web:640ba8a51725f3400dcec2"
};
// Initialize Firebase
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization failed. Using Mock Data Mode.");
}
// --- DOM Elements ---
const adminLoginBtn = document.getElementById("admin-login-btn");
const adminModal = document.getElementById("admin-modal");
const closeModal = document.getElementById("close-modal");
const loginForm = document.getElementById("login-form");
const adminPanel = document.getElementById("admin-panel");
const logoutBtn = document.getElementById("logout-btn");
const themeToggle = document.getElementById("theme-toggle");
// Hamburger Menu Toggle
document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("active");
});
// Theme Management (Light/Dark Mode toggle)
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
themeToggle.innerText = savedTheme === "dark" ? "☀️" : "🌙";
themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    themeToggle.innerText = newTheme === "dark" ? "☀️" : "🌙";
});
// --- Auth State & Login Logic ---
if(auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            adminLoginBtn.innerText = "Admin Panel";
            adminPanel.classList.remove("hidden");
            adminModal.classList.add("hidden");
        } else {
            adminLoginBtn.innerText = "Admin Login";
            adminPanel.classList.add("hidden");
        }
    });
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("admin-email").value;
        const password = document.getElementById("admin-password").value;
        const errorMsg = document.getElementById("login-error");
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                errorMsg.classList.add("hidden");
                adminModal.classList.add("hidden");
                loginForm.reset();
            })
            .catch((error) => {
                errorMsg.innerText = "Invalid credentials.";
                errorMsg.classList.remove("hidden");
            });
    });
    logoutBtn.addEventListener("click", () => {
        signOut(auth);
    });
}
// Modal Toggle Logic
adminLoginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if(auth && auth.currentUser) {
        document.getElementById("admin-panel").scrollIntoView({ behavior: 'smooth' });
    } else {
        adminModal.classList.remove("hidden");
    }
});
closeModal.addEventListener("click", () => {
    adminModal.classList.add("hidden");
});
window.addEventListener("click", (e) => {
    if (e.target === adminModal) {
        adminModal.classList.add("hidden");
    }
});
// --- Data Management (State) ---
let state = {
    teams: [],
    schedule: [],
    results: []
};
// Listeners
if(db) {
    onSnapshot(collection(db, "teams"), (snapshot) => {
        state.teams = [];
        snapshot.forEach(doc => state.teams.push({ id: doc.id, ...doc.data() }));
        renderTeams();
        updateAdminSelectors();
        renderOverallLeaderboard();
    });
    const qSchedule = query(collection(db, "schedule"), orderBy("matchNo", "asc"));
    onSnapshot(qSchedule, (snapshot) => {
        state.schedule = [];
        snapshot.forEach(doc => state.schedule.push({ id: doc.id, ...doc.data() }));
        renderSchedule();
        updateMatchSelectors();
    });
    onSnapshot(collection(db, "results"), (snapshot) => {
        state.results = [];
        snapshot.forEach(doc => state.results.push({ id: doc.id, ...doc.data() }));
        renderMatchLeaderboard();
        renderOverallLeaderboard();
    });
}
// --- Render Functions ---
function renderTeams() {
    const tbody = document.querySelector("#teams-table tbody");
    if(!tbody) return;
    tbody.innerHTML = "";

    const searchTerm = document.getElementById("team-search")?.value.toLowerCase() || "";
    const filterGroup = document.getElementById("team-group-filter")?.value || "All";

    let filteredTeams = state.teams.filter(t => {
        let matchName = t.name.toLowerCase().includes(searchTerm);
        let matchGroup = filterGroup === "All" || (t.group || "Group A") === filterGroup;
        return matchName && matchGroup;
    });

    const finalsMsg = document.getElementById("finals-message");
    if (finalsMsg) {
        if (filterGroup === "Finals") finalsMsg.classList.remove("hidden");
        else finalsMsg.classList.add("hidden");
    }

    if (filteredTeams.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center'>No teams found.</td></tr>";
        return;
    }

    filteredTeams.forEach((team, index) => {
        const teamGroup = team.group || "Group A";
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td style="font-weight:bold; color:var(--accent-secondary);">${team.name}</td>
                <td>${teamGroup}</td>
                <td><span style="color:var(--text-muted)">${team.p1Name}</span> <br> <span style="font-size:0.9rem">${team.p1Ign}</span><hr style="border-color:var(--border-color); margin:4px 0;"><span style="color:var(--text-muted)">${team.p2Name}</span> <br> <span style="font-size:0.9rem">${team.p2Ign}</span></td>
                <td><span style="color:var(--text-muted)">${team.p3Name}</span> <br> <span style="font-size:0.9rem">${team.p3Ign}</span><hr style="border-color:var(--border-color); margin:4px 0;"><span style="color:var(--text-muted)">${team.p4Name}</span> <br> <span style="font-size:0.9rem">${team.p4Ign}</span></td>
            </tr>
        `;
    });
}
document.getElementById("team-search")?.addEventListener("input", renderTeams);
document.getElementById("team-group-filter")?.addEventListener("change", renderTeams);
function renderSchedule() {
    const tbody = document.querySelector("#schedule-table tbody");
    if(!tbody) return;
    tbody.innerHTML = "";
    if (state.schedule.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center'>No matches scheduled yet.</td></tr>";
        return;
    }
    state.schedule.sort((a,b) => a.matchNo - b.matchNo).forEach(match => {
        let statusColor = match.status === 'Live' ? 'var(--accent-primary)' : match.status === 'Completed' ? 'var(--text-muted)' : 'var(--accent-secondary)';
        tbody.innerHTML += `
            <tr>
                <td>Match ${match.matchNo}</td>
                <td>${new Date(match.datetime).toLocaleString([], {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit'})}</td>
                <td>${match.teams}</td>
                <td>${match.map}</td>
                <td style="color: ${statusColor}; font-weight: bold;">${match.status}</td>
            </tr>
        `;
    });
}
function renderMatchLeaderboard() {
    const tbody = document.querySelector("#match-leaderboard-table tbody");
    const matchSelect = document.getElementById("match-select");
    if(!tbody || !matchSelect) return;
    const selectedMatch = parseInt(matchSelect.value);
    tbody.innerHTML = "";
    let matchResults = state.results.filter(r => r.matchNo === selectedMatch);
    matchResults.sort((a, b) => b.totalPoints - a.totalPoints);
    if (matchResults.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center'>No results for this match yet.</td></tr>";
        return;
    }
    matchResults.forEach((result, index) => {
        const team = state.teams.find(t => t.id === result.teamId);
        const teamName = team ? team.name : "Unknown Team";
        let rankClass = index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "";
        let dinnerText = result.chickenDinners > 0 ? `${result.chickenDinners}x` : "-";
        tbody.innerHTML += `
            <tr>
                <td class="${rankClass}">#${index + 1}</td>
                <td style="font-weight:bold;">${teamName}</td>
                <td style="color:var(--accent-secondary); font-weight:bold;">${dinnerText}</td>
                <td>${result.kills}</td>
                <td>${result.placementPoints}</td>
                <td style="color:var(--accent-primary); font-weight:bold; font-size:1.2rem;">${result.totalPoints}</td>
            </tr>
        `;
    });
}
function renderOverallLeaderboard() {
    const tbody = document.querySelector("#overall-table tbody");
    if(!tbody) return;
    tbody.innerHTML = "";
    let overallData = state.teams.map(team => {
        let teamResults = state.results.filter(r => r.teamId === team.id);
        let matchesPlayed = teamResults.length;
        let totalKills = teamResults.reduce((sum, current) => sum + current.kills, 0);
        let totalPlacement = teamResults.reduce((sum, current) => sum + current.placementPoints, 0);
        let totalDinners = teamResults.reduce((sum, current) => sum + (current.chickenDinners || 0), 0);
        let grandTotal = totalKills + totalPlacement;
        return { teamName: team.name, matchesPlayed, totalKills, totalPlacement, totalDinners, grandTotal };
    });
    overallData.sort((a, b) => b.grandTotal - a.grandTotal);
    if (overallData.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center'>No data available.</td></tr>";
        return;
    }
    overallData.forEach((data, index) => {
        let rankClass = index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "";
        let dinnerText = data.totalDinners > 0 ? `${data.totalDinners}x` : "-";
        
        tbody.innerHTML += `
            <tr>
                <td class="${rankClass}">#${index + 1}</td>
                <td style="font-weight:bold;">${data.teamName}</td>
                <td>${data.matchesPlayed}</td>
                <td style="color:var(--accent-secondary); font-weight:bold;">${dinnerText}</td>
                <td>${data.totalKills}</td>
                <td>${data.totalPlacement}</td>
                <td style="color:var(--accent-primary); font-size:1.4rem; font-weight:bold;">${data.grandTotal}</td>
            </tr>
        `;
    });
}
document.getElementById("match-select")?.addEventListener("change", renderMatchLeaderboard);
// --- Admin Forms ---
// 1. Add Team
document.getElementById("form-team")?.addEventListener("submit", async(e) => {
    e.preventDefault();
    if(!db) return mockSubmit(e, "teams");
    const payload = {
        name: document.getElementById("team-name").value,
        group: document.getElementById("team-group").value,
        logo: document.getElementById("team-logo").value,
        p1Name: document.getElementById("p1-name").value, p1Ign: document.getElementById("p1-ign").value,
        p2Name: document.getElementById("p2-name").value, p2Ign: document.getElementById("p2-ign").value,
        p3Name: document.getElementById("p3-name").value, p3Ign: document.getElementById("p3-ign").value,
        p4Name: document.getElementById("p4-name").value, p4Ign: document.getElementById("p4-ign").value,
        createdAt: new Date().toISOString()
    };
    try {
        await addDoc(collection(db, "teams"), payload);
        alert("Team added!"); e.target.reset();
    } catch (err) { alert("Error adding team."); }
});

document.getElementById("form-update-group")?.addEventListener("submit", async(e) => {
    e.preventDefault();
    const teamId = document.getElementById("upd-team-id").value;
    const newGroup = document.getElementById("upd-team-group").value;
    
    if(!db) {
        let team = state.teams.find(t => t.id === teamId);
        if(team) team.group = newGroup;
        renderTeams();
        alert("Team Group Updated (Mock Mode)!"); e.target.reset();
        return;
    }
    try {
        await updateDoc(doc(db, "teams", teamId), { group: newGroup });
        alert("Team Group Updated!"); e.target.reset();
    } catch (err) { alert("Error updating team group."); }
});
// 2. Add / Update Schedule
document.getElementById("form-schedule")?.addEventListener("submit", async(e) => {
    e.preventDefault();
    const matchNo = parseInt(document.getElementById("sch-match-no").value);
    const payload = {
        matchNo: matchNo,
        datetime: document.getElementById("sch-datetime").value,
        teams: document.getElementById("sch-teams").value,
        map: document.getElementById("sch-map").value,
        status: document.getElementById("sch-status").value
    };
    if(!db) {
        // Mock Update logic
        let exIdx = state.schedule.findIndex(s => s.matchNo === matchNo);
        if(exIdx >= 0) { state.schedule[exIdx] = {id: state.schedule[exIdx].id, ...payload}; } 
        else { state.schedule.push({id: "s"+matchNo, ...payload}); }
        renderSchedule(); updateMatchSelectors();
        alert("Schedule Saved (Local Mode)!"); e.target.reset();
        return;
    }
    try {
        // Find if exists
        let existingMatch = state.schedule.find(s => s.matchNo === matchNo);
        if (existingMatch) {
            await updateDoc(doc(db, "schedule", existingMatch.id), payload);
            alert("Match Updated Successfully!");
        } else {
            await addDoc(collection(db, "schedule"), payload);
            alert("New Match created!");
        }
        e.target.reset();
    } catch (err) { alert("Error saving match."); }
});
// 3. Add Result (Chicken Dinner factored)
document.getElementById("form-match-result")?.addEventListener("submit", async(e) => {
    e.preventDefault();
    const kills = parseInt(document.getElementById("res-kills").value);
    const placement = parseInt(document.getElementById("res-placement-points").value);
    const chicken = parseInt(document.getElementById("res-chicken").value) || 0;
    const payload = {
        matchNo: parseInt(document.getElementById("res-match-no").value),
        teamId: document.getElementById("res-team-id").value,
        kills: kills,
        placementPoints: placement,
        totalPoints: kills + placement,
        chickenDinners: chicken
    };
    if(!db) return mockSubmit(e, "results", payload);
    try {
        await addDoc(collection(db, "results"), payload);
        alert("Result added!"); e.target.reset();
    } catch (err) { alert("Error adding result."); }
});
// Utilities
function mockSubmit(e, type, overridePayload = null) {
    alert(`Saved to ${type} (Mock Mode Demo)!`);
    if(type === 'results' && overridePayload) {
        state.results.push({id: 'r'+Math.random(), ...overridePayload});
        renderMatchLeaderboard(); renderOverallLeaderboard();
    }
    e.target.reset();
}
function updateAdminSelectors() {
    const teamSelect = document.getElementById("res-team-id");
    const updSelect = document.getElementById("upd-team-id");
    let options = "<option value=''>Select Team</option>";
    state.teams.forEach(t => { options += `<option value="${t.id}">${t.name}</option>`; });
    if(teamSelect) teamSelect.innerHTML = options;
    if(updSelect) updSelect.innerHTML = options;
}
function updateMatchSelectors() {
    let matches = new Set(state.schedule.map(s => s.matchNo));
    if(matches.size === 0) matches.add(1);
    const options = Array.from(matches).sort((a,b)=>a-b).map(m => `<option value="${m}">Match ${m}</option>`).join("");
    
    document.getElementById("match-select").innerHTML = options;
    document.getElementById("res-match-no").innerHTML = options;
    renderMatchLeaderboard();
}
// --- Placeholder Dummy Data (Auto-Injects if DB empty) ---
setTimeout(() => {
    if(!db || state.teams.length === 0) {
        if(state.teams.length === 0) {
            state.teams = [
                {id: "t1", name: "Team Soul", group: "Group A", p1Name: "Mortal", p1Ign: "SOULmortal", p2Name: "Viper", p2Ign: "SOULviper", p3Name: "Regaltos", p3Ign: "SOULregaltos", p4Name: "Ronak", p4Ign: "SOULronak"},
                {id: "t2", name: "GodLike Esports", group: "Group B", p1Name: "Jonathan", p1Ign: "TSMentJONATHAN", p2Name: "Neyoo", p2Ign: "TSMentNEYOO", p3Name: "ClutchGod", p3Ign: "TSMentCLUTCH", p4Name: "ZGod", p4Ign: "TSMentZGOD"},
                {id: "t3", name: "Team XSpark", group: "Finals", p1Name: "Scout", p1Ign: "TXscout", p2Name: "Mavi", p2Ign: "TXmavi", p3Name: "Daljit", p3Ign: "TXdaljit", p4Name: "Gill", p4Ign: "TXgill"}
            ];
            state.schedule = [
                {id: "s1", matchNo: 1, datetime: new Date().toISOString(), teams: "All Teams", map: "Erangel", status: "Completed"},
                {id: "s2", matchNo: 2, datetime: new Date().toISOString(), teams: "All Teams", map: "Miramar", status: "Live"},
                {id: "s3", matchNo: 3, datetime: new Date(Date.now() + 86400000).toISOString(), teams: "All Teams", map: "Rondo", status: "Upcoming"}
            ];
            state.results = [
                {id: "r1", matchNo: 1, teamId: "t1", kills: 12, placementPoints: 15, totalPoints: 27, chickenDinners: 1},
                {id: "r2", matchNo: 1, teamId: "t2", kills: 8, placementPoints: 12, totalPoints: 20, chickenDinners: 0},
                {id: "r3", matchNo: 1, teamId: "t3", kills: 6, placementPoints: 10, totalPoints: 16, chickenDinners: 0}
            ];
            
            renderTeams(); renderSchedule(); updateAdminSelectors(); updateMatchSelectors(); renderOverallLeaderboard();
        }
    }
}, 1500);

// --- Download Features ---
async function downloadElementAsImage(elementId, format) {
    if (typeof window.html2canvas === 'undefined') {
        alert('html2canvas library is not loaded. Cannot download the image.');
        return;
    }
    
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Add downloading class to style the element for image export
    element.classList.add('is-downloading');
    
    // Short delay to ensure browser applies CSS changes
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
        const bgColor = getComputedStyle(element).backgroundColor || '#0a0a0c';
        
        const canvas = await window.html2canvas(element, {
            scale: 2, 
            useCORS: true,
            backgroundColor: bgColor,
            logging: false
        });
        
        const link = document.createElement('a');
        let title = elementId.includes('match') ? 'Match_Results' : 'Overall_Leaderboard';
        link.download = `${title}_${new Date().getTime()}.${format}`;
        
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        link.href = canvas.toDataURL(mimeType, format === 'jpeg' ? 0.9 : 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error("Error generating image: ", err);
        alert("Could not generate image. Check console for details.");
    } finally {
        // Revert styling
        element.classList.remove('is-downloading');
    }
}

document.getElementById('dl-match-btn')?.addEventListener('click', () => {
    const matchNo = document.getElementById('match-select').value;
    const titleEl = document.getElementById('match-export-title');
    if (titleEl) titleEl.innerText = `Match ${matchNo} Result`;
    downloadElementAsImage('match-export-area', 'png');
});

document.getElementById('dl-overall-btn')?.addEventListener('click', () => {
    downloadElementAsImage('overall-export-area', 'png');
});

document.getElementById('dl-team-btn')?.addEventListener('click', () => {
    const groupFilter = document.getElementById('team-group-filter').value;
    const titleEl = document.getElementById('teams-export-title');
    if (titleEl) {
        titleEl.innerText = groupFilter === 'All' ? 'Participating Teams' : `${groupFilter} Teams`;
    }
    downloadElementAsImage('teams-export-area', 'png');
});