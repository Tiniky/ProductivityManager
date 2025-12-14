function initializeAdvancedPage() {
    productivityData = ProductivityData.load();

    const hasGoals = productivityData.goals && productivityData.goals.length > 0;
    const hasHabits = productivityData.habits && productivityData.habits.length > 0;

    if (!hasGoals && !hasHabits) {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('selectorContainer').style.display = 'none';
        return;
    }

    document.getElementById('selectorContainer').style.display = 'flex';
    document.getElementById('emptyState').style.display = 'none';

    populateSelectors();

    const today = new Date();
    const defaultYear = today.getFullYear();
    const defaultMonth = String(today.getMonth() + 1).padStart(2, '0');

    document.getElementById('yearSelect').value = defaultYear;
    updateMonthSelector();
    document.getElementById('monthSelect').value = defaultMonth;

    loadMonthData(defaultYear, defaultMonth);

    document.getElementById('yearSelect').addEventListener('change', () => {
        updateMonthSelector();
        const year = document.getElementById('yearSelect').value;
        const month = document.getElementById('monthSelect').value;
        loadMonthData(year, month);
    });

    document.getElementById('monthSelect').addEventListener('change', () => {
        const year = document.getElementById('yearSelect').value;
        const month = document.getElementById('monthSelect').value;
        loadMonthData(year, month);
    });
}

function populateSelectors() {
    const years = new Set();

    productivityData.goals.forEach(goal => {
        goal.dailys.forEach(daily => {
            if (daily.date) {
                const year = daily.date.split('-')[0];
                years.add(year);
            }
        });
    });

    productivityData.habits.forEach(habit => {
        (habit.datesWhenAchieved || []).forEach(date => {
            const year = date.split('-')[0];
            years.add(year);
        });
        (habit.datesWhenFailed || []).forEach(date => {
            const year = date.split('-')[0];
            years.add(year);
        });
    });

    const currentYear = new Date().getFullYear();
    years.add(String(currentYear));

    const sortedYears = Array.from(years).sort().reverse();
    const yearSelect = document.getElementById('yearSelect');
    yearSelect.innerHTML = sortedYears.map(year => `<option value="${year}">${year}</option>`).join('');
}

function updateMonthSelector() {
    const selectedYear = document.getElementById('yearSelect').value;
    const months = new Set();

    productivityData.goals.forEach(goal => {
        goal.dailys.forEach(daily => {
            if (daily.date) {
                const [year, month] = daily.date.split('-');
                if (year === selectedYear) {
                    months.add(month);
                }
            }
        });
    });

    productivityData.habits.forEach(habit => {
        (habit.datesWhenAchieved || []).forEach(date => {
            const [year, month] = date.split('-');
            if (year === selectedYear) {
                months.add(month);
            }
        });
        (habit.datesWhenFailed || []).forEach(date => {
            const [year, month] = date.split('-');
            if (year === selectedYear) {
                months.add(month);
            }
        });
    });

    if (months.size > 0) {
        for (let i = 1; i <= 12; i++) {
            months.add(String(i).padStart(2, '0'));
        }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sortedMonths = Array.from(months).sort();
    const monthSelect = document.getElementById('monthSelect');
    monthSelect.innerHTML = sortedMonths.map(month => {
        const monthIndex = parseInt(month) - 1;
        return `<option value="${month}">${monthNames[monthIndex]}</option>`;
    }).join('');
}

function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function loadMonthData(year, month) {
    const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month));
    const dates = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
        dates.push(dateStr);
    }

    loadGoalsTable(year, month, dates);
    loadHabitsTable(year, month, dates);
}

function loadGoalsTable(year, month, dates) {
    const yearMonth = `${year}-${month}`;
    const relevantGoals = [];

    productivityData.goals.forEach(goal => {
        const hasActivityThisMonth = goal.dailys.some(daily => 
            daily.date && daily.date.startsWith(yearMonth)
        );

        const goalStartDate = goal.createdAt.split('T')[0];
        const goalStartMonth = goalStartDate.substring(0, 7);
        const isOngoing = goalStartMonth <= yearMonth;

        if (hasActivityThisMonth || isOngoing) {
            relevantGoals.push(goal);
        }
    });

    const headerRow = document.getElementById('goalsHeaderRow');
    headerRow.innerHTML = '<th></th>';
    dates.forEach(date => {
        const [y, m, d] = date.split('-');
        const headerCell = document.createElement('th');
        headerCell.innerHTML = `<strong>${y}.${m}.${d}</strong>`;
        headerRow.appendChild(headerCell);
    });

    const tbody = document.getElementById('goalsBody');
    tbody.innerHTML = '';

    if (relevantGoals.length === 0) {
        tbody.innerHTML = '<tr><td class="no-data" colspan="' + (dates.length + 1) + '">No goals for this month</td></tr>';
        document.getElementById('goalsSection').style.display = 'block';
        return;
    }

    relevantGoals.forEach(goal => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = goal.name;
        row.appendChild(nameCell);

        dates.forEach(date => {
            const cell = document.createElement('td');
            const hasDaily = goal.dailys.some(daily => daily.date === date);
            if (hasDaily) {
                cell.classList.add('mark');
                cell.classList.add('line-through');
            }
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    applyLineThroughStyling('goalsBody', dates);
    document.getElementById('goalsSection').style.display = 'block';
}

function loadHabitsTable(year, month, dates) {
    const yearMonth = `${year}-${month}`;
    const relevantHabits = [];

    productivityData.habits.forEach(habit => {
        const achievedThisMonth = (habit.datesWhenAchieved || []).some(date => 
            date && date.startsWith(yearMonth)
        );
        const failedThisMonth = (habit.datesWhenFailed || []).some(date => 
            date && date.startsWith(yearMonth)
        );

        if (achievedThisMonth || failedThisMonth) {
            relevantHabits.push(habit);
        }
    });

    const headerRow = document.getElementById('habitsHeaderRow');
    headerRow.innerHTML = '<th></th>';
    dates.forEach(date => {
        const [y, m, d] = date.split('-');
        const headerCell = document.createElement('th');
        headerCell.innerHTML = `<strong>${y}.${m}.${d}</strong>`;
        headerRow.appendChild(headerCell);
    });

    const tbody = document.getElementById('habitsBody');
    tbody.innerHTML = '';

    if (relevantHabits.length === 0) {
        tbody.innerHTML = '<tr><td class="no-data" colspan="' + (dates.length + 1) + '">No habits for this month</td></tr>';
        document.getElementById('habitsSection').style.display = 'block';
        return;
    }

    relevantHabits.forEach(habit => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = habit.name;
        row.appendChild(nameCell);

        dates.forEach(date => {
            const cell = document.createElement('td');
            const wasAchieved = (habit.datesWhenAchieved || []).includes(date);
            if (wasAchieved) {
                cell.classList.add('mark');
                cell.classList.add('line-through');
            }
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    applyLineThroughStyling('habitsBody', dates);
    document.getElementById('habitsSection').style.display = 'block';
}

function applyLineThroughStyling(tbodyId, dates) {
}

function openImportModal() {
    document.getElementById('importModal').classList.add('active');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    document.getElementById('importDate').max = todayStr;
    document.getElementById('importDate').value = '';
    document.getElementById('importTextarea').value = '';
    document.getElementById('importError').classList.remove('visible');
    document.getElementById('importSuccess').classList.remove('visible');
    document.getElementById('importSubmitBtn').disabled = true;
    document.getElementById('importFormatHelp').classList.remove('visible');
    document.getElementById('importTextarea').classList.remove('visible');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
}

function handleDateChange() {
    const dateInput = document.getElementById('importDate');
    const selectedDate = dateInput.value;
    const submitBtn = document.getElementById('importSubmitBtn');
    const textarea = document.getElementById('importTextarea');
    const formatHelp = document.getElementById('importFormatHelp');
    const errorDiv = document.getElementById('importError');

    errorDiv.classList.remove('visible');

    if (!selectedDate) {
        submitBtn.disabled = true;
        textarea.classList.remove('visible');
        formatHelp.classList.remove('visible');
        return;
    }

    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDateObj > today) {
        showError('Date cannot be in the future');
        submitBtn.disabled = true;
        textarea.classList.remove('visible');
        formatHelp.classList.remove('visible');
        return;
    }

    let earliestDate = null;
    productivityData.goals.forEach(goal => {
        goal.dailys.forEach(daily => {
            if (!earliestDate || daily.date < earliestDate) {
                earliestDate = daily.date;
            }
        });
    });
    productivityData.habits.forEach(habit => {
        (habit.datesWhenAchieved || []).forEach(date => {
            if (!earliestDate || date < earliestDate) {
                earliestDate = date;
            }
        });
        (habit.datesWhenFailed || []).forEach(date => {
            if (!earliestDate || date < earliestDate) {
                earliestDate = date;
            }
        });
    });

    if (earliestDate && selectedDate < earliestDate) {
        showError('Date is before your earliest tracked data');
        submitBtn.disabled = true;
        textarea.classList.remove('visible');
        formatHelp.classList.remove('visible');
        return;
    }

    let hasExistingData = false;
    productivityData.goals.forEach(goal => {
        if (goal.dailys.some(daily => daily.date === selectedDate)) {
            hasExistingData = true;
        }
    });
    productivityData.habits.forEach(habit => {
        if ((habit.datesWhenAchieved || []).includes(selectedDate) || 
            (habit.datesWhenFailed || []).includes(selectedDate)) {
            hasExistingData = true;
        }
    });

    if (hasExistingData) {
        showError('This date already has tracked data. Cannot add more data to an already completed day.');
        submitBtn.disabled = true;
        textarea.classList.remove('visible');
        formatHelp.classList.remove('visible');
        return;
    }

    submitBtn.disabled = false;
    textarea.classList.add('visible');
    formatHelp.classList.add('visible');
}

function showError(message) {
    const errorDiv = document.getElementById('importError');
    errorDiv.textContent = '❌ ' + message;
    errorDiv.classList.add('visible');
}

function showSuccess(message) {
    const successDiv = document.getElementById('importSuccess');
    successDiv.textContent = '✅ ' + message;
    successDiv.classList.add('visible');
    setTimeout(() => {
        successDiv.classList.remove('visible');
    }, 3000);
}

function submitImportData() {
    const selectedDate = document.getElementById('importDate').value;
    const textData = document.getElementById('importTextarea').value.trim();

    if (!selectedDate || !textData) {
        showError('Please provide a date and data');
        return;
    }

    const lines = textData.split('\n').filter(line => line.trim());
    let successCount = 0;
    let errorCount = 0;
    let errorMessages = [];

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        if (trimmedLine.startsWith('D:')) {
            // Daily format: D:task name,goal name
            const parts = trimmedLine.substring(2).split(',');
            if (parts.length !== 2) {
                errorMessages.push(`Invalid format: "${trimmedLine}"`);
                errorCount++;
                return;
            }

            const taskName = parts[0].trim();
            const goalName = parts[1].trim();

            // Find goal with exact match (case-insensitive)
            const goal = productivityData.goals.find(g => 
                g.name.toLowerCase() === goalName.toLowerCase()
            );

            if (!goal) {
                errorMessages.push(`Goal not found: "${goalName}"`);
                errorCount++;
                return;
            }

            // Create daily
            const daily = {
                id: productivityData.generateId(),
                goalId: goal.id,
                name: taskName,
                state: 'achieved',
                date: selectedDate,
                failureReason: null,
                createdAt: new Date().toISOString()
            };

            goal.dailys.push(daily);
            successCount++;

        } else if (trimmedLine.startsWith('H:')) {
            // Habit format: H:habit name
            const habitName = trimmedLine.substring(2).trim();

            // Find habit with exact match (case-insensitive)
            const habit = productivityData.habits.find(h => 
                h.name.toLowerCase() === habitName.toLowerCase()
            );

            if (!habit) {
                errorMessages.push(`Habit not found: "${habitName}"`);
                errorCount++;
                return;
            }

            // Add to achieved dates
            if (!habit.datesWhenAchieved) habit.datesWhenAchieved = [];
            if (!habit.datesWhenAchieved.includes(selectedDate)) {
                habit.datesWhenAchieved.push(selectedDate);
                successCount++;
            }

        } else {
            errorMessages.push(`Invalid format: "${trimmedLine}". Use D: or H: prefix`);
            errorCount++;
        }
    });

    // Save data
    productivityData.save();

    // Show results
    if (errorCount > 0) {
        showError(errorMessages.join('; '));
    }
    if (successCount > 0) {
        showSuccess(`${successCount} item(s) imported successfully`);
        setTimeout(() => {
            closeImportModal();
            location.reload(); // Refresh to show updated data
        }, 2000);
    }
}

// Modal backdrop click to close
document.getElementById('importModal').addEventListener('click', (e) => {
    if (e.target.id === 'importModal') {
        closeImportModal();
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeAdvancedPage);
