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
    results: [],
    settings: { hideOverall: false, revealStatus: 0 }
};
// Listeners
if(db) {
    onSnapshot(doc(db, "settings", "tournament"), (docSnap) => {
        if(docSnap.exists()) {
            let data = docSnap.data();
            state.settings.hideOverall = data.hideOverall || false;
            state.settings.revealStatus = data.revealStatus || 0;
            renderOverallLeaderboard();
            renderChampionsReveal();
        }
    });
    onSnapshot(collection(db, "teams"), (snapshot) => {
        state.teams = [];
        snapshot.forEach(doc => state.teams.push({ id: doc.id, ...doc.data() }));
        renderTeams();
        updateAdminSelectors();
        renderOverallLeaderboard();
        renderChampionsReveal();
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
        renderChampionsReveal();
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
    const groupSelect = document.getElementById("match-group-filter");
    if(!tbody || !matchSelect) return;
    
    const selectedMatch = parseInt(matchSelect.value);
    const filterGroup = groupSelect?.value || "All";
    
    tbody.innerHTML = "";
    let matchResults = state.results.filter(r => r.matchNo === selectedMatch);
    
    let populatedResults = matchResults.map(r => {
        const team = state.teams.find(t => t.id === r.teamId);
        return { ...r, teamName: team ? team.name : "Unknown Team", group: team ? (team.group || "Group A") : "Unknown" };
    });

    if (filterGroup !== "All") {
        populatedResults = populatedResults.filter(r => r.group === filterGroup);
    }

    populatedResults.sort((a, b) => b.totalPoints - a.totalPoints);
    
    if (populatedResults.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center'>No results for this match yet.</td></tr>";
        return;
    }
    populatedResults.forEach((result, index) => {
        let rankClass = index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "";
        let dinnerText = result.chickenDinners > 0 ? `${result.chickenDinners}x` : "-";
        tbody.innerHTML += `
            <tr>
                <td class="${rankClass}">#${index + 1}</td>
                <td style="font-weight:bold;">${result.teamName}</td>
                <td style="color:var(--accent-secondary); font-weight:bold;">${dinnerText}</td>
                <td>${result.kills}</td>
                <td>${result.placementPoints}</td>
                <td style="color:var(--accent-primary); font-weight:bold; font-size:1.2rem;">${result.totalPoints}</td>
            </tr>
        `;
    });
}
function renderOverallLeaderboard() {
    const overallSection = document.getElementById("overall-leaderboard");
    if (state.settings.hideOverall && state.settings.revealStatus === 0) {
        if(overallSection) {
            overallSection.querySelector('.table-container')?.classList.add("hidden");
            let suspMsg = document.getElementById("suspense-msg");
            if(!suspMsg) {
                suspMsg = document.createElement("div");
                suspMsg.id = "suspense-msg";
                suspMsg.innerHTML = "<h3 style='text-align:center; color:var(--accent-primary); margin: 2rem 0; font-family:var(--font-heading);'>Calculations are ongoing. The Overall Leaderboard is currently hidden for suspense!</h3>";
                overallSection.querySelector('.container').appendChild(suspMsg);
            }
            suspMsg.classList.remove("hidden");
        }
    } else {
        if(overallSection) {
            overallSection.querySelector('.table-container')?.classList.remove("hidden");
            document.getElementById("suspense-msg")?.classList.add("hidden");
        }
    }

    const tbody = document.querySelector("#overall-table tbody");
    if(!tbody) return;
    tbody.innerHTML = "";
    
    const filterGroup = document.getElementById("overall-group-filter")?.value || "All";
    
    let overallData = state.teams.map(team => {
        let teamResults = state.results.filter(r => r.teamId === team.id);
        let matchesPlayed = teamResults.length;
        let totalKills = teamResults.reduce((sum, current) => sum + current.kills, 0);
        let totalPlacement = teamResults.reduce((sum, current) => sum + current.placementPoints, 0);
        let totalDinners = teamResults.reduce((sum, current) => sum + (current.chickenDinners || 0), 0);
        let grandTotal = totalKills + totalPlacement;
        let group = team.group || "Group A";
        return { teamName: team.name, group, matchesPlayed, totalKills, totalPlacement, totalDinners, grandTotal };
    });
    
    if(filterGroup !== "All") {
        overallData = overallData.filter(d => d.group === filterGroup);
    }
    
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
document.getElementById("match-group-filter")?.addEventListener("change", renderMatchLeaderboard);
document.getElementById("overall-group-filter")?.addEventListener("change", renderOverallLeaderboard);
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
                {id: "t1", name: "Team Soul", group: "Finals", p1Name: "Mortal", p1Ign: "SOULmortal", p2Name: "Viper", p2Ign: "SOULviper", p3Name: "Regaltos", p3Ign: "SOULregaltos", p4Name: "Ronak", p4Ign: "SOULronak"},
                {id: "t2", name: "GodLike Esports", group: "Finals", p1Name: "Jonathan", p1Ign: "TSMentJONATHAN", p2Name: "Neyoo", p2Ign: "TSMentNEYOO", p3Name: "ClutchGod", p3Ign: "TSMentCLUTCH", p4Name: "ZGod", p4Ign: "TSMentZGOD"},
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
    
    // Temporarily allow document to expand horizontally to capture full table on mobile
    const originalBodyOverflow = document.body.style.overflow || '';
    const originalDocOverflow = document.documentElement.style.overflow || '';
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';
    
    // Short delay to ensure browser applies CSS changes
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
        const bgColor = getComputedStyle(element).backgroundColor || '#0a0a0c';
        
        const canvas = await window.html2canvas(element, {
            scale: 2, 
            useCORS: true,
            backgroundColor: bgColor,
            logging: false,
            // Capture full scrollable dimension ensuring no cutoff
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight
        });
        
        const link = document.createElement('a');
        let title = elementId.includes('match') ? 'Match_Results' : 
                    elementId.includes('team') ? 'Participating_Teams' : 
                    elementId.includes('scoring') ? 'Scoring_System' : 
                    'Overall_Leaderboard';
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
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        element.classList.remove('is-downloading');
    }
}

document.getElementById('dl-scoring-btn')?.addEventListener('click', () => {
    downloadElementAsImage('scoring-export-area', 'png');
});

document.getElementById('dl-match-btn')?.addEventListener('click', () => {
    const matchNo = document.getElementById('match-select').value;
    const groupFilter = document.getElementById('match-group-filter').value;
    const titleEl = document.getElementById('match-export-title');
    if (titleEl) {
        titleEl.innerText = groupFilter === 'All' ? `Match ${matchNo} Result` : `Match ${matchNo} Result - ${groupFilter}`;
    }
    downloadElementAsImage('match-export-area', 'png');
});

document.getElementById('dl-overall-btn')?.addEventListener('click', () => {
    const groupFilter = document.getElementById('overall-group-filter').value;
    const titleEl = document.getElementById('overall-export-title');
    if (titleEl) {
        titleEl.innerText = groupFilter === 'All' ? 'Overall Ranking' : `Overall Ranking - ${groupFilter}`;
    }
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

// --- Champions Reveal Logic ---
function renderChampionsReveal() {
    const rs = state.settings.revealStatus; // 0=None, 1=RunnerUp, 2=Champions
    
    const btnOverall = document.getElementById("btn-toggle-overall");
    if(btnOverall) {
        btnOverall.innerText = state.settings.hideOverall ? "Show Overall Leaderboard" : "Hide Overall Leaderboard";
        btnOverall.style.background = state.settings.hideOverall ? "#ff5252" : "";
    }

    const sectionsToHide = ['scoring', 'schedule', 'match-leaderboard', 'teams', 'maps']; // Overall Leaderboard is kept for bottom
    
    let finalsTeams = state.teams.filter(t => t.group === "Finals");
    let teamsToConsider = finalsTeams.length > 0 ? finalsTeams : state.teams;
    
    let overallData = teamsToConsider.map(team => {
        let teamResults = state.results.filter(r => r.teamId === team.id);
        let totalKills = teamResults.reduce((sum, current) => sum + current.kills, 0);
        let totalPlacement = teamResults.reduce((sum, current) => sum + current.placementPoints, 0);
        return { team, grandTotal: totalKills + totalPlacement };
    });
    overallData.sort((a, b) => b.grandTotal - a.grandTotal);
    
    const champObj = overallData.length > 0 ? overallData[0] : null;
    const runnerObj = overallData.length > 1 ? overallData[1] : null;

    const champCard = document.getElementById("card-champion");
    const runnerCard = document.getElementById("card-runnerup");

    if (rs > 0) {
        document.getElementById("champions")?.classList.remove("hidden");
        sectionsToHide.forEach(id => document.getElementById(id)?.classList.add("hidden"));
        
        const overallFilter = document.getElementById("overall-group-filter");
        if(overallFilter && overallFilter.value !== "Finals") {
            overallFilter.value = "Finals";
            renderOverallLeaderboard();
        }
        
        // Setup Runner Up Display
        if(rs >= 1 && runnerObj && runnerObj.grandTotal > 0) {
            runnerCard.classList.remove("hidden");
            let c = runnerObj.team;
            runnerCard.innerHTML = `
                <div style="font-size: 3rem; line-height:1; margin-bottom: 0.5rem;">🥈</div>
                <h2 style="font-size: clamp(2rem, 4vw, 3rem); margin: 0; color: #fff; text-shadow: 0 0 15px var(--silver); letter-spacing: 1px;">${c.name}</h2>
                <p style="color:var(--text-muted); font-size:1.1rem; margin-top:1rem; font-weight:bold;">${c.p1Ign} &nbsp;•&nbsp; ${c.p2Ign} &nbsp;•&nbsp; ${c.p3Ign} &nbsp;•&nbsp; ${c.p4Ign}</p>
                <div style="display:inline-block; margin-top:1rem; padding: 0.3rem 1.5rem; background:rgba(192,192,192,0.2); border-radius:50px; border:1px solid var(--silver);">
                    <span style="font-size: 1.2rem; color: var(--silver); font-weight: bold;">${runnerObj.grandTotal} POINTS (RUNNER-UP)</span>
                </div>
            `;
        } else {
            runnerCard.classList.add("hidden");
        }

        // Setup Champion Display
        if(rs >= 2 && champObj && champObj.grandTotal > 0) {
            champCard.classList.remove("hidden");
            let c = champObj.team;
            champCard.innerHTML = `
                <div style="font-size: 5rem; line-height:1; margin-bottom: 1rem; animation: pulse 2s infinite;">🏆</div>
                <h1 style="font-size: clamp(3rem, 6vw, 5rem); margin: 0; color: #fff; text-shadow: 0 0 30px var(--gold); letter-spacing: 2px;">${c.name}</h1>
                <p style="color:var(--text-muted); font-size:1.3rem; margin-top:1.5rem; letter-spacing:1px; font-weight:bold;">${c.p1Ign} &nbsp;•&nbsp; ${c.p2Ign} &nbsp;•&nbsp; ${c.p3Ign} &nbsp;•&nbsp; ${c.p4Ign}</p>
                <div style="display:inline-block; margin-top:2rem; padding: 0.5rem 2rem; background:rgba(255,215,0,0.2); border-radius:50px; border:1px solid var(--gold);">
                    <span style="font-size: 1.5rem; color: var(--gold); font-weight: bold;">${champObj.grandTotal} POINT VICTORY (CHAMPION)</span>
                </div>
            `;
            renderConfetti(true); // Golden confetti
        } else {
            champCard.classList.add("hidden");
            if (rs === 1) renderConfetti(false); // Silver confetti
        }
    } else {
        document.getElementById("champions")?.classList.add("hidden");
        sectionsToHide.forEach(id => document.getElementById(id)?.classList.remove("hidden"));
        document.getElementById("confetti-container").innerHTML = "";
    }
}

function renderConfetti(isGold) {
    const container = document.getElementById("confetti-container");
    if(!container) return;
    container.innerHTML = "";
    for(let i=0; i<70; i++) {
        const conf = document.createElement("div");
        conf.classList.add("confetti-piece");
        conf.style.left = Math.random() * 100 + "%";
        conf.style.animationDelay = Math.random() * 4 + "s";
        let color1 = isGold ? "var(--gold)" : "var(--silver)";
        let color2 = isGold ? "var(--accent-primary)" : "#fff";
        conf.style.backgroundColor = Math.random() > 0.5 ? color1 : color2;
        container.appendChild(conf);
    }
}

document.getElementById('btn-toggle-overall')?.addEventListener('click', () => { state.settings.hideOverall = !state.settings.hideOverall; syncSettings("Overall Leaderboard " + (state.settings.hideOverall ? "Hidden" : "Visible")); });
document.getElementById('btn-reveal-runnerup')?.addEventListener('click', () => { state.settings.revealStatus = 1; syncSettings("Runner Up Revealed!"); });
document.getElementById('btn-reveal-champion')?.addEventListener('click', () => { state.settings.revealStatus = 2; syncSettings("Champions Revealed!"); });
document.getElementById('btn-reset-reveal')?.addEventListener('click', () => { state.settings.revealStatus = 0; syncSettings("Reveals Reset."); });

async function syncSettings(msg) {
    if(db) {
        try { await setDoc(doc(db, "settings", "tournament"), state.settings, { merge: true }); } 
        catch(e) { console.error(e); }
    } else {
        renderChampionsReveal();
        renderOverallLeaderboard();
        alert(msg + " (Mock Mode)");
    }
}
