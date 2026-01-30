(() => {
  // DOM Elements
  const qText = document.getElementById('qText'), optionsEl = document.getElementById('options');
  const paginationEl = document.getElementById('pagination'), timerEl = document.getElementById('timer');
  const examArea = document.getElementById('examArea'), resultArea = document.getElementById('resultArea');
  const minsInput = document.getElementById('mins'), startBtn = document.getElementById('startBtn');
  const answerKey = document.getElementById('answerKey');

  let questions = [], currentIndex = 0, answers = [], started = false, timer = null, remainingSeconds = 0;

  // NEW: Logic to load questions from external JSON or Internal Fallback
  async function loadQuestions() {
    try {
      // Try to fetch external file
      const response = await fetch('questions.json');
      if (!response.ok) throw new Error("File not found");
      const data = await response.json();
      console.log("Questions loaded from questions.json");
      return data;
    } catch (err) {
      // Fallback to the <script id="sample-questions"> in exam.html
      console.warn("External questions.json not found, using embedded samples.");
      const embedded = document.getElementById('sample-questions').textContent;
      return JSON.parse(embedded);
    }
  }

  async function init() {
    // Identity Check
    const name = localStorage.getItem('candidateName') || "Guest Candidate";
    const num = localStorage.getItem('examNumber') || "000";
    document.getElementById('candidateHeader').innerHTML = `Candidate: <strong>${name}</strong> | ID: <strong>${num}</strong>`;

    // Load Data
    questions = await loadQuestions();
    answers = Array(questions.length).fill(null);
    
    buildPagination();
    updateTimerDisplay(parseInt(minsInput.value) * 60);
  }

  // ... (buildPagination and renderQuestion stay the same as previous)

  function buildPagination() {
    paginationEl.innerHTML = '';
    questions.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className = 'page-btn unanswered';
      btn.textContent = i + 1;
      btn.onclick = () => { if(started) renderQuestion(i); };
      paginationEl.appendChild(btn);
    });
  }

  function renderQuestion(index) {
    currentIndex = index;
    const q = questions[index];
    qText.innerText = `Q${index + 1}. ${q.question}`;
    optionsEl.innerHTML = '';

    q.choices.forEach((choice, idx) => {
      const opt = document.createElement('div');
      opt.className = `option ${answers[index] === idx ? 'selected' : ''}`;
      opt.innerHTML = `<strong>${String.fromCharCode(65+idx)}.</strong> ${choice}`;
      opt.onclick = () => {
        answers[index] = idx;
        renderQuestion(index);
        updateUI();
      };
      optionsEl.appendChild(opt);
    });
    updateUI();
  }

  function updateUI() {
    const nodes = Array.from(paginationEl.children);
    nodes.forEach((btn, i) => {
      btn.classList.toggle('current', i === currentIndex);
      btn.classList.toggle('answered', answers[i] !== null);
      btn.classList.toggle('unanswered', answers[i] === null);
    });
    const count = answers.filter(a => a !== null).length;
    document.getElementById('progressInfo').innerText = `Answered ${count} of ${questions.length}`;
  }

  function startTimer(duration) {
    remainingSeconds = duration;
    timer = setInterval(() => {
      remainingSeconds--;
      updateTimerDisplay(remainingSeconds);
      if (remainingSeconds <= 0) { clearInterval(timer); endExam(); }
    }, 1000);
  }

  function updateTimerDisplay(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    timerEl.innerText = `${m}:${s}`;
    document.getElementById('timerAside').innerText = `${m}:${s}`;
    if (sec < 300) timerEl.classList.add('red');
  }

  function endExam() {
    started = false;
    clearInterval(timer);
    examArea.classList.add('hidden');
    resultArea.classList.remove('hidden');

    document.getElementById('resName').innerText = localStorage.getItem('candidateName');
    document.getElementById('resNum').innerText = localStorage.getItem('examNumber');

    let correct = 0;
    answerKey.innerHTML = ''; // Clear previous results

    questions.forEach((q, i) => {
      const isCorrect = (answers[i] === q.answerIndex);
      if (isCorrect) correct++;

      // Build the Answer Key Review
      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `
        <p><strong>Q${i+1}: ${q.question}</strong></p>
        <p class="small">Your answer: <span style="color:${isCorrect?'green':'red'}">${answers[i] !== null ? q.choices[answers[i]] : 'No Answer'}</span></p>
        <p class="small">Correct: <strong>${q.choices[q.answerIndex]}</strong></p>
        ${q.explanation ? `<p class="small"><em>Note: ${q.explanation}</em></p>` : ''}
        <hr>
      `;
      answerKey.appendChild(row);
    });
    
    document.getElementById('finalScore').innerText = `${correct} / ${questions.length}`;
    document.getElementById('scorePercent').innerText = `${Math.round((correct/questions.length)*100)}%`;
  }

  startBtn.onclick = () => {
    started = true;
    document.getElementById('setupControls').classList.add('hidden');
    examArea.classList.remove('hidden');
    renderQuestion(0);
    startTimer(parseInt(minsInput.value) * 60);
  };

  document.getElementById('prevBtn').onclick = () => { if(currentIndex > 0) renderQuestion(currentIndex-1); };
  document.getElementById('nextBtn').onclick = () => { if(currentIndex < questions.length-1) renderQuestion(currentIndex+1); };
  document.getElementById('submitBtn').onclick = () => { if(confirm("Submit exam?")) endExam(); };

  init();
})();
gination();
    renderQuestion(0);
    examArea.classList.remove('hidden');
    resultArea.classList.add('hidden');
    updateProgress();
    updateTimerDisplay(0);
  });

  // init on load
  init();

  // expose a convenience function in console for debug
  window._cbt_debug = {questions, answers};
})();
