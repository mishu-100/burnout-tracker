let chart; // will hold our chart instance

async function addEntry() {
  const sleep_hours = parseFloat(document.getElementById('sleep').value);
  const study_hours = parseFloat(document.getElementById('study').value);
  const mood = parseInt(document.getElementById('mood').value);

  if (isNaN(sleep_hours) || isNaN(study_hours) || isNaN(mood)) {
    document.getElementById('entryMessage').innerText = 'Please fill all fields';
    return;
  }

  const res = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sleep_hours, study_hours, mood })
  });

  const data = await res.json();

  if (res.ok) {
    document.getElementById('entryMessage').innerText = 'Saved!';
    document.getElementById('sleep').value = '';
    document.getElementById('study').value = '';
    document.getElementById('mood').value = '';
    loadEntries(); // refresh chart + risk after saving
  } else {
    document.getElementById('entryMessage').innerText = data.error;
  }
}

async function loadEntries() {
  const res = await fetch('/api/entries');
  const entries = await res.json();

  if (!res.ok) {
    if (res.status === 401) window.location.href = '/'; // not logged in, send back
    return;
  }

  calculateRisk(entries);
  drawChart(entries);
}

function calculateRisk(entries) {
  const riskDiv = document.getElementById('riskResult');

  if (entries.length === 0) {
    riskDiv.innerText = 'No data yet';
    return;
  }

  // Look at the last 3 entries (or fewer if not enough yet)
  const recent = entries.slice(-3);

  const lowSleepDays = recent.filter(e => e.sleep_hours < 6).length;
  const highStudyDays = recent.filter(e => e.study_hours > 6).length;
  const lowMoodDays = recent.filter(e => e.mood <= 2).length;

  let risk = 'Low';
  let reason = 'Your sleep, study, and mood balance looks healthy.';

  if (lowSleepDays >= 3 && highStudyDays >= 3) {
    risk = 'High';
    reason = `You've had ${lowSleepDays} days of low sleep and ${highStudyDays} days of heavy study recently. This combination is a strong burnout signal.`;
  } else if (lowSleepDays >= 2 || highStudyDays >= 2 || lowMoodDays >= 2) {
    risk = 'Moderate';
    reason = 'A few recent days show signs of strain. Worth keeping an eye on.';
  }

  riskDiv.innerHTML = `<strong>${risk} Risk</strong><br><span style="font-size:13px; color:#ccc;">${reason}</span>`;

  riskDiv.style.background = risk === 'High' ? '#4a1c1c' : risk === 'Moderate' ? '#4a3c1c' : '#1c4a2c';
}

function drawChart(entries) {
  const ctx = document.getElementById('trendChart');

  const labels = entries.map(e => e.date);
  const sleepData = entries.map(e => e.sleep_hours);
  const studyData = entries.map(e => e.study_hours);
  const moodData = entries.map(e => e.mood);

  if (chart) chart.destroy(); // clear old chart before redrawing

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Sleep hours', data: sleepData, borderColor: '#42a5f5', tension: 0.3 },
        { label: 'Study hours', data: studyData, borderColor: '#ef5350', tension: 0.3 },
        { label: 'Mood', data: moodData, borderColor: '#66bb6a', tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#f0f0f0' } } },
      scales: {
        x: { ticks: { color: '#aaa' } },
        y: { ticks: { color: '#aaa' } }
      }
    }
  });
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

// Load entries as soon as the dashboard opens
loadEntries();