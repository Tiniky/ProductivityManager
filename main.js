// core
class ProductivityData {
    constructor() {
        this.goals = [];
        this.habits = [];
        this.version = "1.0";
    }

    createGoal(name, state = 'backlog') {
        const goal = {
            id: this.generateId(),
            name: name,
            state: state,
            dailys: [],
            createdAt: new Date().toISOString()
        };
        this.goals.push(goal);
        this.save();
        return goal;
    }

    createDaily(goalId, name, date = null, state = 'in-progress') {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return null;

        const daily = {
            id: this.generateId(),
            goalId: goalId,
            name: name,
            state: state,
            date: date || new Date().toISOString().split('T')[0],
            failureReason: null,
            createdAt: new Date().toISOString()
        };
        goal.dailys.push(daily);
        
        if (goal.state === 'backlog') {
            goal.state = 'in-progress';
        }
        
        this.save();
        return daily;
    }

    createHabit(name, type = 'active', description = '') {
        const habit = {
            id: this.generateId(),
            name: name,
            type: type,
            description: description,
            active: true,
            datesWhenAchieved: [],
            datesWhenFailed: [],
            createdAt: new Date().toISOString()
        };
        this.habits.push(habit);
        this.save();
        return habit;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    save() {
        localStorage.setItem('productivityData', JSON.stringify(this));
    }

    static load() {
        const data = localStorage.getItem('productivityData');
        if (data) {
            const parsed = JSON.parse(data);
            const instance = new ProductivityData();
            Object.assign(instance, parsed);
            return instance;
        }
        return new ProductivityData();
    }

    exportToJSON() {
        const dataStr = JSON.stringify(this, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `productivity-plan-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    static importFromJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            const instance = new ProductivityData();
            Object.assign(instance, parsed);
            instance.save();
            return instance;
        } catch (error) {
            console.error('Error importing JSON:', error);
            return null;
        }
    }
}

// global var
let productivityData = null;

// html related initialization - common
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'index.html' || currentPage === '') {
        checkForExistingData();
    } else {
        productivityData = ProductivityData.load();
        initializePage();
    }
});

function checkForExistingData() {
    const hasData = localStorage.getItem('productivityData');
    if (!hasData) {
        showInitialLoadScreen();
    } else {
        productivityData = ProductivityData.load();
        initializeHomePage();
    }
}

function showInitialLoadScreen() {
    document.querySelector('.nav-left').style.display = 'none';
    document.querySelector('.nav-right').style.display = 'none';
    const overlay = document.createElement('div');
    overlay.className = 'initial-load-overlay';
    overlay.innerHTML = `
        <div class="initial-load-content">
            <h2>Welcome to Productivity Manager!</h2>
            <p>Do you have an existing Productivity Plan?</p>
            <div class="initial-load-buttons">
                <button id="createNewBtn" class="initial-btn">Create New Plan</button>
                <button id="uploadPlanBtn" class="initial-btn">Upload Existing Plan</button>
            </div>
            <input type="file" id="fileInput" accept=".json" style="display: none;">
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('createNewBtn').addEventListener('click', createNewPlan);
    document.getElementById('uploadPlanBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
}

function createNewPlan() {
    productivityData = new ProductivityData();
    productivityData.save();
    removeOverlayAndInitialize();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const jsonString = e.target.result;
        productivityData = ProductivityData.importFromJSON(jsonString);
        if (productivityData) {
            removeOverlayAndInitialize();
        } else {
            alert('Error loading file. Please check the JSON format.');
        }
    };
    reader.readAsText(file);
}

function removeOverlayAndInitialize() {
    const overlay = document.querySelector('.initial-load-overlay');
    if (overlay) overlay.remove();
    
    document.querySelector('.nav-left').style.display = 'block';
    document.querySelector('.nav-right').style.display = 'block';
    initializeHomePage();
}

function initializePage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'index.html' || currentPage === '') {
        initializeHomePage();
    } else if (currentPage === 'editor.html') {
        initializeEditorPage();
    } else if (currentPage === 'whattodo.html') {
        initializeWhatToDoPage();
    }
}

// home
function initializeHomePage() {
    updateHomeStats();
    if (!document.getElementById('downloadPlanBtn')) {
        const statsSection = document.querySelector('.stats-overview');
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'downloadPlanBtn';
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = 'Download Productivity Plan';
        downloadBtn.addEventListener('click', () => {
            if (productivityData) {
                productivityData.exportToJSON();
            }
        });
        statsSection.appendChild(downloadBtn);
    }
}

function updateHomeStats() {
    if (!productivityData) return;

    const activeGoals = productivityData.goals.filter(g => 
        g.state === 'in-progress' || g.state === 'backlog'
    ).length;
    const completedGoals = productivityData.goals.filter(g => 
        g.state === 'achieved'
    ).length;
    const habitsCount = productivityData.habits.length;
    let dailyCount = 0;
    productivityData.goals.forEach(goal => {
        dailyCount += goal.dailys.length;
    });
    let totalTasks = 0;
    let completedTasks = 0;
    
    productivityData.goals.forEach(goal => {
        goal.dailys.forEach(daily => {
            totalTasks++;
            if (daily.state === 'achieved') completedTasks++;
        });
    });
    productivityData.habits.forEach(habit => {
        if (!habit.datesWhenAchieved) habit.datesWhenAchieved = [];
        if (!habit.datesWhenFailed) habit.datesWhenFailed = [];
        
        const achievedCount = habit.datesWhenAchieved.length;
        const failedCount = habit.datesWhenFailed.length;
        
        totalTasks += achievedCount + failedCount;
        completedTasks += achievedCount;
    });
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    document.getElementById('activeGoals').textContent = activeGoals;
    document.getElementById('habitsCount').textContent = habitsCount;
    document.getElementById('dailyCount').textContent = dailyCount;
    document.getElementById('completionRate').textContent = completionRate + '%';
    document.getElementById('completedGoals').textContent = completedGoals;
    const completionCard = document.getElementById('completionRate').parentElement;
    if (completionRate < 60) {
        completionCard.style.background = 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)';
    } else if (completionRate <= 80) {
        completionCard.style.background = 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)';
    } else {
        completionCard.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
    }
    const activityList = document.getElementById('activityList');
    const inProgressGoals = productivityData.goals.filter(g => g.state === 'in-progress');
    if (inProgressGoals.length === 0) {
        activityList.innerHTML = '<p class="empty-state">No goals in progress. Start working on your goals!</p>';
    } else {
        activityList.innerHTML = inProgressGoals.map(goal => `
            <div class="activity-item">
                <strong>${goal.name}</strong>
                <span class="activity-meta">${goal.dailys.length} dailys</span>
            </div>
        `).join('');
    }
}

// editor
function initializeEditorPage() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    document.getElementById('addGoalBtn')?.addEventListener('click', addGoal);
    document.getElementById('addDailyBtn')?.addEventListener('click', showAddDailyPopup);
    document.getElementById('addHabitBtn')?.addEventListener('click', showAddHabitPopup);
    document.getElementById('goalInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addGoal();
    });
    renderGoalsList();
    renderDailysList();
    renderHabitsList();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

function addGoal() {
    const input = document.getElementById('goalInput');
    const value = input.value.trim();
    if (value && productivityData) {
        productivityData.createGoal(value);
        input.value = '';
        renderGoalsList();
    }
}

function showAddDailyPopup() {
    if (!productivityData || productivityData.goals.length === 0) {
        alert('Please create a goal first before adding dailys!');
        return;
    }

    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.innerHTML = `
        <div class="modal-content">
            <h3>Create New Daily</h3>
            <div class="form-group">
                <label>Daily Name:</label>
                <input type="text" id="modalDailyName" placeholder="Enter daily task name...">
            </div>
            <div class="form-group">
                <label>Date:</label>
                <input type="date" id="modalDailyDate" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Goal:</label>
                <select id="modalDailyGoal">
                    <option value="">-NONE-</option>
                    ${productivityData.goals.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                </select>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn cancel-btn" onclick="closeModal()">Cancel</button>
                <button class="modal-btn confirm-btn" onclick="confirmAddDaily()">Create Daily</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function confirmAddDaily() {
    const name = document.getElementById('modalDailyName').value.trim();
    const date = document.getElementById('modalDailyDate').value;
    const goalId = document.getElementById('modalDailyGoal').value;
    if (!name) {
        alert('Please enter a daily name!');
        return;
    }
    if (!goalId) {
        alert('Please select a goal for this daily!');
        return;
    }

    productivityData.createDaily(goalId, name, date);
    closeModal();
    renderDailysList();
    renderGoalsList();
}

function showAddHabitPopup() {
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.innerHTML = `
        <div class="modal-content">
            <h3>Create New Habit</h3>
            <div class="form-group">
                <label>Habit Name:</label>
                <input type="text" id="modalHabitName" placeholder="Enter habit name...">
            </div>
            <div class="form-group">
                <label>Type:</label>
                <select id="modalHabitType">
                    <option value="active">Active (Task to complete)</option>
                    <option value="passive">Passive (Checkbox only)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <textarea id="modalHabitDesc" placeholder="Describe the habit in detail..." rows="4"></textarea>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn cancel-btn" onclick="closeModal()">Cancel</button>
                <button class="modal-btn confirm-btn" onclick="confirmAddHabit()">Create Habit</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function confirmAddHabit() {
    const name = document.getElementById('modalHabitName').value.trim();
    const type = document.getElementById('modalHabitType').value;
    const description = document.getElementById('modalHabitDesc').value.trim();
    if (!name) {
        alert('Please enter a habit name!');
        return;
    }

    productivityData.createHabit(name, type, description);
    closeModal();
    renderHabitsList();
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

function renderGoalsList() {
    const list = document.getElementById('goalsList');
    if (!productivityData || productivityData.goals.length === 0) {
        list.innerHTML = '<p class="empty-state">No goals yet. Add your first goal above!</p>';
        return;
    }

    list.innerHTML = productivityData.goals.map(goal => `
        <div class="record-item goal-item" onclick="openGoalDetail('${goal.id}')">
            <span class="record-name">${goal.name}</span>
            <span class="record-state state-${goal.state}">${goal.state}</span>
        </div>
    `).join('');
}

function renderDailysList() {
    const list = document.getElementById('dailysList');
    if (!productivityData) {
        list.innerHTML = '<p class="empty-state">No daily tasks yet.</p>';
        return;
    }

    const allDailys = [];
    productivityData.goals.forEach(goal => {
        goal.dailys.forEach(daily => {
            allDailys.push({ ...daily, goalName: goal.name });
        });
    });
    if (allDailys.length === 0) {
        list.innerHTML = '<p class="empty-state">No daily tasks yet. Add your first daily above!</p>';
        return;
    }

    list.innerHTML = allDailys.map(daily => `
        <div class="record-item daily-item" onclick="openDailyDetail('${daily.id}')">
            <span class="record-name">${daily.name}</span>
            <span class="record-meta">${daily.date} | ${daily.goalName}</span>
            <span class="record-state state-${daily.state}">${daily.state}</span>
        </div>
    `).join('');
}

function renderHabitsList() {
    const list = document.getElementById('habitsList');
    if (!productivityData || productivityData.habits.length === 0) {
        list.innerHTML = '<p class="empty-state">No habits yet. Add your first habit above!</p>';
        return;
    }

    list.innerHTML = productivityData.habits.map(habit => `
        <div class="record-item habit-item" onclick="openHabitDetail('${habit.id}')">
            <span class="record-name">${habit.name}</span>
            <span class="record-meta">${habit.type}${habit.active ? '' : ' (inactive)'}</span>
        </div>
    `).join('');
}

function openGoalDetail(goalId) {
    const goal = productivityData.goals.find(g => g.id === goalId);
    if (!goal) return;

    const isReadOnly = goal.state === 'achieved' || goal.state === 'failed';
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.innerHTML = `
        <div class="modal-content detail-modal">
            <h3>Goal Details</h3>
            <div class="form-group">
                <label>Name:</label>
                <input type="text" id="detailGoalName" value="${goal.name}" ${isReadOnly ? 'readonly' : ''}>
            </div>
            <div class="form-group">
                <label>State:</label>
                <select id="detailGoalState" ${isReadOnly ? 'disabled' : ''}>
                    <option value="backlog" ${goal.state === 'backlog' ? 'selected' : ''}>Backlog</option>
                    <option value="in-progress" ${goal.state === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="achieved" ${goal.state === 'achieved' ? 'selected' : ''}>Achieved</option>
                    <option value="failed" ${goal.state === 'failed' ? 'selected' : ''}>Failed</option>
                </select>
            </div>
            <div class="form-group">
                <label>Related Dailys:</label>
                <div class="dailys-list">
                    ${goal.dailys.length === 0 ? '<p class="empty-state">No dailys yet</p>' : 
                        goal.dailys.map(d => `
                            <div class="daily-link" onclick="event.stopPropagation(); closeModal(); openDailyDetail('${d.id}')">
                                ${d.name} - ${d.state}
                            </div>
                        `).join('')}
                </div>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn cancel-btn" onclick="closeModal()">Close</button>
                ${!isReadOnly ? `<button class="modal-btn confirm-btn" onclick="saveGoalDetail('${goalId}')">Save</button>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function saveGoalDetail(goalId) {
    const goal = productivityData.goals.find(g => g.id === goalId);
    if (!goal) return;

    goal.name = document.getElementById('detailGoalName').value.trim();
    goal.state = document.getElementById('detailGoalState').value;
    productivityData.save();
    closeModal();
    renderGoalsList();
}

function openDailyDetail(dailyId) {
    let daily = null;
    let parentGoal = null;
    for (const goal of productivityData.goals) {
        daily = goal.dailys.find(d => d.id === dailyId);
        if (daily) {
            parentGoal = goal;
            break;
        }
    }

    if (!daily || !parentGoal) return;

    const isReadOnly = daily.state === 'achieved' || daily.state === 'failed';
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.innerHTML = `
        <div class="modal-content detail-modal">
            <h3>Daily Details</h3>
            <div class="form-group">
                <label>Name:</label>
                <input type="text" id="detailDailyName" value="${daily.name}" ${isReadOnly ? 'readonly' : ''}>
            </div>
            <div class="form-group">
                <label>Date:</label>
                <input type="date" id="detailDailyDate" value="${daily.date}" ${isReadOnly ? 'readonly' : ''}>
            </div>
            <div class="form-group">
                <label>State:</label>
                <select id="detailDailyState" ${isReadOnly ? 'disabled' : ''} onchange="toggleFailureReason()">
                    <option value="in-progress" ${daily.state === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="achieved" ${daily.state === 'achieved' ? 'selected' : ''}>Achieved</option>
                    <option value="failed" ${daily.state === 'failed' ? 'selected' : ''}>Failed</option>
                </select>
            </div>
            <div class="form-group" id="failureReasonGroup" style="display: ${daily.state === 'failed' ? 'block' : 'none'}">
                <label>Failure Reason:</label>
                <textarea id="detailDailyFailure" ${isReadOnly ? 'readonly' : ''}>${daily.failureReason || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Goal:</label>
                <div class="goal-link" onclick="event.stopPropagation(); closeModal(); openGoalDetail('${parentGoal.id}')">
                    ${parentGoal.name}
                </div>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn cancel-btn" onclick="closeModal()">Close</button>
                ${!isReadOnly ? `<button class="modal-btn confirm-btn" onclick="saveDailyDetail('${dailyId}')">Save</button>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function toggleFailureReason() {
    const state = document.getElementById('detailDailyState').value;
    const group = document.getElementById('failureReasonGroup');
    group.style.display = state === 'failed' ? 'block' : 'none';
}

function saveDailyDetail(dailyId) {
    let daily = null;
    for (const goal of productivityData.goals) {
        daily = goal.dailys.find(d => d.id === dailyId);
        if (daily) break;
    }

    if (!daily) return;

    daily.name = document.getElementById('detailDailyName').value.trim();
    daily.date = document.getElementById('detailDailyDate').value;
    daily.state = document.getElementById('detailDailyState').value;
    daily.failureReason = document.getElementById('detailDailyFailure').value.trim() || null;
    productivityData.save();
    closeModal();
    renderDailysList();
}

function openHabitDetail(habitId) {
    const habit = productivityData.habits.find(h => h.id === habitId);
    if (!habit) return;

    const completedCount = habit.datesWhenAchieved?.length || 0;
    const failedCount = habit.datesWhenFailed?.length || 0;
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.innerHTML = `
        <div class="modal-content detail-modal">
            <h3>Habit Details</h3>
            <div class="form-group">
                <label>Name:</label>
                <input type="text" id="detailHabitName" value="${habit.name}">
            </div>
            ${!habit.active ? `
            <div class="form-group">
                <label>Status:</label>
                <span class="inactive-badge">Inactive</span>
            </div>` : ''}
            <div class="form-group">
                <label>Type:</label>
                <input type="text" value="${habit.type}" readonly>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <textarea id="detailHabitDesc" rows="4">${habit.description || ''}</textarea>
            </div>
            <div class="stats-row">
                <div class="stat-item">
                    <label>Completed:</label>
                    <span class="stat-value">${completedCount}</span>
                </div>
                <div class="stat-item">
                    <label>Failed:</label>
                    <span class="stat-value">${failedCount}</span>
                </div>
            </div>
            <div class="modal-buttons">
                ${habit.active ? `<button class="modal-btn deactivate-btn" onclick="deactivateHabit('${habitId}')">Deactivate</button>` : 
                                 `<button class="modal-btn confirm-btn" onclick="activateHabit('${habitId}')">Activate</button>`}
                <button class="modal-btn cancel-btn" onclick="closeModal()">Close</button>
                <button class="modal-btn confirm-btn" onclick="saveHabitDetail('${habitId}')">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function saveHabitDetail(habitId) {
    const habit = productivityData.habits.find(h => h.id === habitId);
    if (!habit) return;

    habit.name = document.getElementById('detailHabitName').value.trim();
    habit.description = document.getElementById('detailHabitDesc').value.trim();
    productivityData.save();
    closeModal();
    renderHabitsList();
}

function deactivateHabit(habitId) {
    const habit = productivityData.habits.find(h => h.id === habitId);
    if (!habit) return;

    habit.active = false;
    productivityData.save();
    closeModal();
    renderHabitsList();
}

function activateHabit(habitId) {
    const habit = productivityData.habits.find(h => h.id === habitId);
    if (!habit) return;

    habit.active = true;
    productivityData.save();
    closeModal();
    renderHabitsList();
}

// today
function initializeWhatToDoPage() {
    const dateElement = document.getElementById('todayDate');
    if (dateElement) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = today.toLocaleDateString('en-US', options);
    }

    document.getElementById('helpDecideBtn')?.addEventListener('click', showHelpDecideWheel);
    document.getElementById('endDayBtn')?.addEventListener('click', showEndDayConfirmation);
    loadActiveTasks();
}

function loadActiveTasks() {
    if (!productivityData) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastEndedDay = localStorage.getItem('lastEndedDay');
    if (lastEndedDay === today) {
        clearWhatToDoSections();
        const endDayBtn = document.getElementById('endDayBtn');
        const helpDecideBtn = document.getElementById('helpDecideBtn');
        if (endDayBtn) {
            endDayBtn.disabled = true;
            endDayBtn.style.opacity = '0.5';
            endDayBtn.style.cursor = 'not-allowed';
        }
        if (helpDecideBtn) {
            helpDecideBtn.disabled = true;
            helpDecideBtn.style.opacity = '0.5';
            helpDecideBtn.style.cursor = 'not-allowed';
        }
        return;
    }
    
    const endDayBtn = document.getElementById('endDayBtn');
    const helpDecideBtn = document.getElementById('helpDecideBtn');
    if (endDayBtn) {
        endDayBtn.disabled = false;
        endDayBtn.style.opacity = '1';
        endDayBtn.style.cursor = 'pointer';
    }
    if (helpDecideBtn) {
        helpDecideBtn.disabled = false;
        helpDecideBtn.style.opacity = '1';
        helpDecideBtn.style.cursor = 'pointer';
    }
    
    const activeTasks = [];
    productivityData.goals.forEach(goal => {
        goal.dailys.forEach(daily => {
            if (daily.date === today) {
                activeTasks.push({
                    type: 'daily',
                    id: daily.id,
                    name: daily.name,
                    goalName: goal.name,
                    state: daily.state
                });
            }
        });
    });
    
    productivityData.habits.forEach(habit => {
        if (habit.active && habit.type === 'active') {
            const datesAchieved = habit.datesWhenAchieved || [];
            const completedToday = datesAchieved.includes(today);
            activeTasks.push({
                type: 'habit',
                id: habit.id,
                name: habit.name,
                completed: completedToday
            });
        }
    });
    
    activeTasks.sort((a, b) => a.name.localeCompare(b.name));
    const activeTasksList = document.getElementById('activeTasksList');
    if (activeTasks.length === 0) {
        activeTasksList.innerHTML = '<p class="empty-state">No active tasks for today.</p>';
    } else {
        activeTasksList.innerHTML = activeTasks.map(task => {
            const isCompleted = task.type === 'daily' ? task.state === 'achieved' : task.completed;
            return `
                <div class="task-item ${isCompleted ? 'completed' : ''}">
                    <span class="task-name">${task.name}</span>
                    ${task.type === 'daily' ? `<span class="task-meta">${task.goalName}</span>` : '<span class="task-meta">Habit</span>'}
                    <button class="complete-btn" onclick="completeActiveTask('${task.id}', '${task.type}')" ${isCompleted ? 'disabled' : ''}>
                        ${isCompleted ? '✓' : 'Complete'}
                    </button>
                </div>
            `;
        }).join('');
    }
    
    const passiveHabits = productivityData.habits.filter(h => h.active && h.type === 'passive');
    passiveHabits.sort((a, b) => a.name.localeCompare(b.name));
    const passiveHabitsList = document.getElementById('passiveHabitsList');
    if (passiveHabits.length === 0) {
        passiveHabitsList.innerHTML = '<p class="empty-state">No passive habits to track today.</p>';
    } else {
        passiveHabitsList.innerHTML = passiveHabits.map(habit => {
            const datesAchieved = habit.datesWhenAchieved || [];
            const isCompleted = datesAchieved.includes(today);
            return `
                <div class="habit-item ${isCompleted ? 'completed' : ''}">
                    <span class="habit-name">${habit.name}</span>
                    <input type="checkbox" 
                           class="habit-checkbox" 
                           ${isCompleted ? 'checked' : ''}
                           onchange="togglePassiveHabit('${habit.id}', this.checked)">
                </div>
            `;
        }).join('');
    }
}

function completeActiveTask(taskId, taskType) {
    const today = new Date().toISOString().split('T')[0];
    if (taskType === 'daily') {
        for (const goal of productivityData.goals) {
            const daily = goal.dailys.find(d => d.id === taskId);
            if (daily) {
                daily.state = 'achieved';
                break;
            }
        }
    } else if (taskType === 'habit') {
        const habit = productivityData.habits.find(h => h.id === taskId);
        if (habit) {
            if (!habit.datesWhenAchieved) habit.datesWhenAchieved = [];
            if (!habit.datesWhenFailed) habit.datesWhenFailed = [];
            
            habit.datesWhenFailed = habit.datesWhenFailed.filter(d => d !== today);
            if (!habit.datesWhenAchieved.includes(today)) {
                habit.datesWhenAchieved.push(today);
            }
        }
    }
    
    productivityData.save();
    loadActiveTasks();
}

function togglePassiveHabit(habitId, isChecked) {
    const habit = productivityData.habits.find(h => h.id === habitId);
    if (!habit) return;
    if (!habit.datesWhenAchieved) habit.datesWhenAchieved = [];
    if (!habit.datesWhenFailed) habit.datesWhenFailed = [];
    
    const today = new Date().toISOString().split('T')[0];
    if (isChecked) {
        habit.datesWhenFailed = habit.datesWhenFailed.filter(d => d !== today);
        if (!habit.datesWhenAchieved.includes(today)) {
            habit.datesWhenAchieved.push(today);
        }
    } else {
        habit.datesWhenAchieved = habit.datesWhenAchieved.filter(d => d !== today);
    }
    
    productivityData.save();
    loadActiveTasks();
}

function showHelpDecideWheel() {
    if (!productivityData) return;
    
    const today = new Date().toISOString().split('T')[0];
    const availableTasks = [];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'];
    productivityData.goals.forEach(goal => {
        goal.dailys.forEach(daily => {
            if (daily.date === today && daily.state === 'in-progress') {
                availableTasks.push({ name: daily.name, type: 'daily' });
            }
        });
    });
    productivityData.habits.forEach(habit => {
        if (habit.active && habit.type === 'active') {
            const datesAchieved = habit.datesWhenAchieved || [];
            const datesFailed = habit.datesWhenFailed || [];
            const completedToday = datesAchieved.includes(today);
            const failedToday = datesFailed.includes(today);
            if (!completedToday && !failedToday) {
                availableTasks.push({ name: habit.name, type: 'habit' });
            }
        }
    });
    if (availableTasks.length === 0) {
        alert('No tasks available to choose from!');
        return;
    }
    if (availableTasks.length === 1) {
        const popup = document.createElement('div');
        popup.className = 'modal-overlay';
        popup.innerHTML = `
            <div class="modal-content">
                <h3>Your Task</h3>
                <div class="slot-result" style="display: block; margin: 2rem 0;">
                    <strong>Your task:</strong> ${availableTasks[0].name}
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn confirm-btn" onclick="closeModal()">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        return;
    }
    
    const tasksWithColors = availableTasks.map((task, i) => ({
        ...task,
        color: colors[i % colors.length]
    }));
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.innerHTML = `
        <div class="modal-content slot-modal">
            <h3>Help Decide!</h3>
            <div class="slot-machine">
                <div class="slot-viewport">
                    <div class="slot-reel" id="taskReel">
                        ${tasksWithColors.map(task => `
                            <div class="slot-item" style="border-left: 4px solid ${task.color};">
                                ${task.name}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="slot-selector"></div>
            </div>
            <div id="slotResult" class="slot-result"></div>
            <div class="modal-buttons">
                <button class="modal-btn cancel-btn" onclick="closeModal()">Cancel</button>
                <button class="modal-btn confirm-btn" id="spinSlotBtn">Spin!</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    document.getElementById('spinSlotBtn').addEventListener('click', () => spinSlot(tasksWithColors));
}

function spinSlot(tasks) {
    const reel = document.getElementById('taskReel');
    const result = document.getElementById('slotResult');
    const spinBtn = document.getElementById('spinSlotBtn');
    spinBtn.disabled = true;
    result.style.display = 'none';
    const itemHeight = 60;
    const repeatCount = 20;
    const extendedTasks = [];
    for (let i = 0; i < repeatCount; i++) {
        extendedTasks.push(...tasks);
    }
    
    reel.innerHTML = extendedTasks.map(task => `
        <div class="slot-item" style="border-left: 4px solid ${task.color};">
            ${task.name}
        </div>
    `).join('');
    
    const selectedIndex = Math.floor(Math.random() * tasks.length);
    const selectedTask = tasks[selectedIndex];
    const totalSpins = 15;
    const finalItemIndex = (totalSpins * tasks.length) + selectedIndex;
    const finalPosition = (finalItemIndex * itemHeight) - 60;
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    reel.offsetHeight;
    setTimeout(() => {
        reel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        reel.style.transform = `translateY(-${finalPosition}px)`;
    }, 50);
    setTimeout(() => {
        result.innerHTML = `<strong>Your task:</strong> ${selectedTask.name}`;
        result.style.display = 'block';
        spinBtn.disabled = false;
    }, 3200);
}

function showEndDayConfirmation() {
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.innerHTML = `
        <div class="modal-content">
            <h3>End Day</h3>
            <p>Are you sure you want to end the day? All incomplete tasks will be marked as failed.</p>
            <div class="modal-buttons">
                <button class="modal-btn cancel-btn" onclick="closeModal()">Cancel</button>
                <button class="modal-btn confirm-btn" onclick="processEndDay()">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function processEndDay() {
    if (!productivityData) return;
    
    const today = new Date().toISOString().split('T')[0];
    const failedDailys = [];
    let achievedCount = 0;
    let failedCount = 0;
    productivityData.goals.forEach(goal => {
        goal.dailys.forEach(daily => {
            if (daily.date === today) {
                if (daily.state === 'achieved') {
                    achievedCount++;
                } else if (daily.state === 'in-progress') {
                    failedDailys.push({ daily, goalName: goal.name });
                    failedCount++;
                }
            }
        });
    });
    productivityData.habits.forEach(habit => {
        if (habit.active) {
            if (!habit.datesWhenAchieved) habit.datesWhenAchieved = [];
            if (!habit.datesWhenFailed) habit.datesWhenFailed = [];
            
            const completedToday = habit.datesWhenAchieved.includes(today);
            const failedToday = habit.datesWhenFailed.includes(today);
            
            if (completedToday) {
                achievedCount++;
            } else if (!failedToday) {
                habit.datesWhenAchieved = habit.datesWhenAchieved.filter(d => d !== today);
                if (!habit.datesWhenFailed.includes(today)) {
                    habit.datesWhenFailed.push(today);
                }
                failedCount++;
            }
        }
    });
    if (failedDailys.length > 0) {
        showFailureReasonForm(failedDailys, achievedCount, failedCount);
    } else {
        showEndDaySummary(achievedCount, failedCount);
    }
}

function showFailureReasonForm(failedDailys, achievedCount, failedCount) {
    closeModal();
    window.pendingEndDayData = {
        dailyIds: failedDailys.map(f => f.daily.id),
        achievedCount,
        failedCount
    };
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.innerHTML = `
        <div class="modal-content end-day-modal">
            <h3>Provide Failure Reasons</h3>
            <p>Please provide reasons for failed daily tasks:</p>
            ${failedDailys.map((item, index) => `
                <div class="failure-reason-group">
                    <label><strong>${item.daily.name}</strong> (${item.goalName})</label>
                    <textarea id="failureReason${index}" placeholder="Why did this task fail?" rows="2"></textarea>
                </div>
            `).join('')}
            <div class="modal-buttons">
                <button class="modal-btn confirm-btn" id="completeEndDayBtn">Complete</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    document.getElementById('completeEndDayBtn').addEventListener('click', () => {
        finalizeEndDay(window.pendingEndDayData.dailyIds, window.pendingEndDayData.achievedCount, window.pendingEndDayData.failedCount);
    });
}

function finalizeEndDay(dailyIds, achievedCount, failedCount) {
    dailyIds.forEach((dailyId, index) => {
        const reason = document.getElementById(`failureReason${index}`).value.trim();
        for (const goal of productivityData.goals) {
            const daily = goal.dailys.find(d => d.id === dailyId);
            if (daily) {
                daily.state = 'failed';
                daily.failureReason = reason || 'No reason provided';
                break;
            }
        }
    });
    
    productivityData.save();
    closeModal();
    showEndDaySummary(achievedCount, failedCount);
}

function showEndDaySummary(achievedCount, failedCount) {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('lastEndedDay', today);
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.innerHTML = `
        <div class="modal-content">
            <h3>Day Summary</h3>
            <div class="summary-stats">
                <div class="summary-item achieved">
                    <span class="summary-label">Achieved:</span>
                    <span class="summary-value">${achievedCount}</span>
                </div>
                <div class="summary-item failed">
                    <span class="summary-label">Failed:</span>
                    <span class="summary-value">${failedCount}</span>
                </div>
            </div>
            <p>Great work today! Rest well and try again tomorrow.</p>
            <div class="modal-buttons">
                <button class="modal-btn confirm-btn" onclick="closeModal(); clearWhatToDoSections();">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function clearWhatToDoSections() {
    document.getElementById('activeTasksList').innerHTML = '<p class="empty-state">Day ended. Come back tomorrow!</p>';
    document.getElementById('passiveHabitsList').innerHTML = '<p class="empty-state">Day ended. Come back tomorrow!</p>';
}
