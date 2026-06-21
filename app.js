// 1. Mouse Glow Effect for Advanced Background
document.addEventListener('mousemove', (e) => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
});

// 2. State & Data Management (Offline + Export/Import)
let usersDB = JSON.parse(localStorage.getItem('dopo_users_db')) || {};
let loggedInUser = sessionStorage.getItem('dopo_active_user');

let state = {
    tasks: [],
    goals: [],
    completions: {},
    currentCalendarDate: new Date()
};
let editingTaskId = null;

// لود اولیه برنامه هنگام باز شدن سایت
window.onload = () => {
    initApp();
};

function initApp() {
    if(!loggedInUser) {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    } else {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('display-username').innerText = loggedInUser;
        loadUserData();
        updateGoalSelects();
        renderAll();
    }
}

function loadUserData() {
    const userData = JSON.parse(localStorage.getItem(`dopo_data_${loggedInUser}`)) || { tasks: [], goals: [], completions: {} };
    state.tasks = userData.tasks || [];
    state.goals = userData.goals || [];
    state.completions = userData.completions || {};
    state.currentCalendarDate = new Date();
}

function saveState() {
    if(!loggedInUser) return;
    
    const userData = {
        tasks: state.tasks,
        goals: state.goals,
        completions: state.completions
    };
    
    localStorage.setItem(`dopo_data_${loggedInUser}`, JSON.stringify(userData));
}

// === سیستم پشتیبان‌گیری و انتقال اطلاعات (Backup & Restore) ===

window.exportData = function() {
    if(!loggedInUser) return;
    const userData = {
        tasks: state.tasks,
        goals: state.goals,
        completions: state.completions
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `DOPO_Backup_${loggedInUser}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

window.importData = function(event) {
    if(!loggedInUser) return;
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if(importedData.tasks && importedData.goals) {
                state.tasks = importedData.tasks;
                state.goals = importedData.goals;
                state.completions = importedData.completions || {};
                saveState();
                updateGoalSelects();
                renderAll();
                alert('اطلاعات با موفقیت منتقل شد!');
            } else {
                alert('فایل بکاپ نامعتبر است.');
            }
        } catch (err) {
            alert('خطا در خواندن فایل.');
        }
        // پاک کردن فایل برای اجازه انتخاب مجدد
        event.target.value = '';
    };
    reader.readAsText(file);
};

// ==========================================

// 3. Login / Signup Logic
window.handleLogin = function() {
    const userInp = document.getElementById('login-username').value.trim();
    const passInp = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');

    if(userInp === '' || passInp === '') return;

    if(usersDB[userInp]) {
        if(usersDB[userInp] === passInp) {
            errorMsg.style.display = 'none';
            loginUser(userInp);
        } else {
            errorMsg.innerText = 'رمز عبور اشتباه است!';
            errorMsg.style.display = 'block';
        }
    } else {
        // ساخت حساب جدید
        usersDB[userInp] = passInp;
        localStorage.setItem('dopo_users_db', JSON.stringify(usersDB));
        errorMsg.style.display = 'none';
        loginUser(userInp);
    }
};

function loginUser(username) {
    loggedInUser = username;
    sessionStorage.setItem('dopo_active_user', username);
    initApp();
}

window.logoutUser = function() {
    sessionStorage.removeItem('dopo_active_user');
    loggedInUser = null;
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    initApp();
};

function getDateStr(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function convertToPersianNumber(num) {
    if(isNaN(num)) return '۰';
    const persianDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    return num.toString().replace(/\d/g, x => persianDigits[x]);
}

// 4. Tab Switching
function switchTab(targetId) {
    document.querySelectorAll('.nav-btn').forEach(b => {
        if(b.dataset.target === targetId) b.classList.add('active');
        else b.classList.remove('active');
    });
    document.querySelectorAll('.view-section').forEach(c => {
        if(c.id === targetId) c.classList.add('active');
        else c.classList.remove('active');
    });
    renderAll();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        const targetBtn = e.target.closest('.nav-btn');
        if(targetBtn) switchTab(targetBtn.dataset.target);
    });
});

window.goToTasks = function() {
    switchTab('tasks');
};

// 5. Modal & Form Logic
window.openTaskModal = function(taskId = null, presetDate = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('add-task-form');
    const titleEl = document.getElementById('modal-title-text');
    
    if (taskId) {
        editingTaskId = taskId;
        const task = state.tasks.find(t => t.id === taskId);
        if(task) {
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-date').value = task.startDate;
            document.getElementById('task-recurring').value = task.recurring || 'none';
            document.getElementById('task-goal').value = task.goalId || '';
        }
        if(titleEl) titleEl.innerText = 'ویرایش کار';
    } else {
        editingTaskId = null;
        form.reset();
        document.getElementById('task-date').value = presetDate ? presetDate : getDateStr(new Date());
        if(titleEl) titleEl.innerText = 'ایجاد کار جدید';
    }
    modal.classList.add('active');
};

window.closeTaskModal = function() {
    document.getElementById('task-modal').classList.remove('active');
    editingTaskId = null;
};

document.getElementById('task-modal').addEventListener('click', (e) => {
    if(e.target.id === 'task-modal') closeTaskModal();
});

document.getElementById('add-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const date = document.getElementById('task-date').value;
    const recurring = document.getElementById('task-recurring').value;
    const goalId = document.getElementById('task-goal').value;

    if (editingTaskId) {
        const taskIndex = state.tasks.findIndex(t => t.id === editingTaskId);
        if(taskIndex > -1) {
            state.tasks[taskIndex].title = title;
            state.tasks[taskIndex].startDate = date;
            state.tasks[taskIndex].recurring = recurring;
            state.tasks[taskIndex].goalId = goalId;
        }
    } else {
        state.tasks.push({
            id: 'task_' + Date.now(),
            title,
            startDate: date,
            recurring,
            goalId
        });
    }
    
    saveState();
    renderAll();
    closeTaskModal();
});

document.getElementById('add-goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('goal-title').value;
    const target = parseInt(document.getElementById('goal-target').value);
    const period = document.getElementById('goal-period').value;

    state.goals.push({
        id: 'goal_' + Date.now(),
        title,
        target,
        period
    });
    saveState();
    updateGoalSelects();
    renderAll();
    e.target.reset();
});

// 6. Action Handlers
window.toggleCompletion = function(taskId, dateStr) {
    const key = `${taskId}_${dateStr}`;
    if (state.completions[key]) {
        delete state.completions[key];
    } else {
        state.completions[key] = true;
    }
    saveState();
    renderAll();
};

window.deleteTask = function(id) {
    if(confirm('آیا از حذف این کار مطمئن هستید؟')){
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveState();
        renderAll();
    }
};

window.deleteGoal = function(id) {
    if(confirm('آیا از حذف این هدف مطمئن هستید؟')){
        state.goals = state.goals.filter(g => g.id !== id);
        state.tasks = state.tasks.map(t => {
            if (t.goalId === id) return {...t, goalId: ''};
            return t;
        });
        saveState();
        updateGoalSelects();
        renderAll();
    }
};

// 7. Render Functions
function getTasksForDate(dateStr) {
    const dateObj = new Date(dateStr);
    return state.tasks.filter(task => {
        if (!task.startDate) return false;
        if (task.startDate === dateStr) return true;
        if (task.startDate > dateStr) return false; 
        const startObj = new Date(task.startDate);
        if (task.recurring === 'daily') return true;
        if (task.recurring === 'weekly') {
            return dateObj.getDay() === startObj.getDay();
        }
        if (task.recurring === 'monthly') {
            return dateObj.getDate() === startObj.getDate();
        }
        return false;
    });
}

function renderTasks() {
    const todayStr = getDateStr(new Date());
    const todayTasks = getTasksForDate(todayStr);

    const dashboardContainer = document.getElementById('dashboard-today-list');
    if(dashboardContainer) {
        dashboardContainer.innerHTML = '';
        let doneCount = 0;

        if(todayTasks.length === 0) {
            dashboardContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">برای امروز کاری تعیین نشده است.</p>';
        } else {
            todayTasks.forEach(task => {
                const isCompleted = !!state.completions[`${task.id}_${todayStr}`];
                if(isCompleted) doneCount++;
                
                const div = document.createElement('div');
                div.className = `task-item ${isCompleted ? 'completed' : ''}`;
                div.innerHTML = `
                    <div class="task-left">
                        <input type="checkbox" class="custom-check" ${isCompleted ? 'checked' : ''} onchange="toggleCompletion('${task.id}', '${todayStr}')">
                        <div class="task-content">
                            <span class="task-title-text">${task.title}</span>
                        </div>
                    </div>
                `;
                dashboardContainer.appendChild(div);
            });
        }

        document.getElementById('stat-today-total').innerText = convertToPersianNumber(todayTasks.length);
        document.getElementById('stat-today-done').innerText = convertToPersianNumber(doneCount);
    }

    const allContainer = document.getElementById('all-tasks-list');
    if(allContainer) {
        allContainer.innerHTML = '';
        
        if(state.tasks.length === 0) {
            allContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">شما هنوز هیچ کاری در DO PO ثبت نکرده‌اید.</p>';
        } else {
            state.tasks.forEach(task => {
                const div = document.createElement('div');
                div.className = 'task-item';
                
                let recText = 'بدون تکرار';
                if(task.recurring === 'daily') recText = 'تکرار روزانه';
                if(task.recurring === 'weekly') recText = 'تکرار هفتگی';
                if(task.recurring === 'monthly') recText = 'تکرار ماهانه';

                const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`;
                const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>`;

                div.innerHTML = `
                    <div class="task-left">
                        <div class="task-content">
                            <span class="task-title-text">${task.title}</span>
                            <span class="task-meta">شروع: ${task.startDate} • ${recText}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-edit" onclick="openTaskModal('${task.id}')" title="ویرایش">
                            ${editIcon}
                        </button>
                        <button class="btn-delete" onclick="deleteTask('${task.id}')" title="حذف">
                            ${trashIcon}
                        </button>
                    </div>
                `;
                allContainer.appendChild(div);
            });
        }
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if(!grid) return;
    grid.innerHTML = '';

    const year = state.currentCalendarDate.getFullYear();
    const month = state.currentCalendarDate.getMonth();

    const monthNamesFa = ['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
    document.getElementById('calendar-month-year').innerText = `${monthNamesFa[month]} ${year}`;

    let firstDayOfMonth = new Date(year, month, 1).getDay();
    let startIndex = (firstDayOfMonth + 1) % 7; 
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        grid.appendChild(emptyDiv);
    }

    const todayStr = getDateStr(new Date());

    for (let d = 1; d <= daysInMonth; d++) {
        const dayDate = new Date(year, month, d);
        const dateStr = getDateStr(dayDate);

        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        if (dateStr === todayStr) dayDiv.classList.add('today');

        dayDiv.onclick = () => {
            openTaskModal(null, dateStr);
        };

        const headerDiv = document.createElement('div');
        headerDiv.className = 'cal-day-header';
        
        const dayNumDiv = document.createElement('div');
        dayNumDiv.className = 'day-number';
        dayNumDiv.innerText = convertToPersianNumber(d);

        headerDiv.appendChild(dayNumDiv);
        dayDiv.appendChild(headerDiv);

        const tasksForDay = getTasksForDate(dateStr);
        tasksForDay.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.className = 'cal-task';
            const isCompleted = !!state.completions[`${task.id}_${dateStr}`];
            if (isCompleted) taskDiv.classList.add('completed');
            taskDiv.innerText = task.title;
            
            taskDiv.onclick = (e) => {
                e.stopPropagation();
                toggleCompletion(task.id, dateStr);
            };
            dayDiv.appendChild(taskDiv);
        });

        grid.appendChild(dayDiv);
    }
}

function renderGoals() {
    const container = document.getElementById('goals-list');
    if(!container) return;
    container.innerHTML = '';

    if(state.goals.length === 0) {
        container.innerHTML = '<div class="card"><p style="color: var(--text-muted); text-align:center;">هیچ هدفی ثبت نشده است.</p></div>';
        return;
    }

    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();

    state.goals.forEach(goal => {
        const linkedTasks = state.tasks.filter(t => t.goalId === goal.id).map(t => t.id);
        let count = 0;
        
        Object.keys(state.completions).forEach(key => {
            if(!state.completions[key]) return;
            
            const lastUnderscore = key.lastIndexOf('_');
            if(lastUnderscore === -1) return;
            
            const tId = key.substring(0, lastUnderscore);
            const dateStr = key.substring(lastUnderscore + 1);
            
            if (linkedTasks.includes(tId)) {
                const cDate = new Date(dateStr);
                if (goal.period === 'monthly') {
                    if (cDate.getFullYear() === currYear && cDate.getMonth() === currMonth) count++;
                } else {
                    if (cDate.getFullYear() === currYear) count++;
                }
            }
        });

        const safeTarget = goal.target > 0 ? goal.target : 1;
        const percentage = Math.min((count / safeTarget) * 100, 100) || 0;
        
        const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`;

        const div = document.createElement('div');
        div.className = 'goal-card';
        div.innerHTML = `
            <div class="goal-header-top">
                <div>
                    <div class="goal-title">${goal.title}</div>
                    <div class="goal-badge">${goal.period === 'monthly' ? 'هدف ماهانه' : 'هدف سالانه'}</div>
                </div>
                <button class="btn-delete" onclick="deleteGoal('${goal.id}')" title="حذف هدف">
                    ${trashIcon}
                </button>
            </div>
            
            <div style="margin-top: 24px;">
                <div class="goal-progress-text">
                    ${convertToPersianNumber(Math.round(percentage))}% تکمیل شده 
                    <span style="float:left; font-weight:normal; color:var(--text-muted); font-size:12px;">(${convertToPersianNumber(count)} از ${convertToPersianNumber(goal.target)})</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateGoalSelects() {
    const select = document.getElementById('task-goal');
    if(!select) return;
    const currentVal = select.value;
    
    select.innerHTML = '<option value="">بدون هدف (آزاد)</option>';
    state.goals.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.innerText = g.title;
        select.appendChild(opt);
    });
    
    if(currentVal) select.value = currentVal;
}

function renderAll() {
    renderTasks();
    renderCalendar();
    renderGoals();
}

document.getElementById('prev-month').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('next-month').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
    renderCalendar();
});

// Start the App
initApp();