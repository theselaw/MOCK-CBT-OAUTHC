/*
 CBT Exam Tool JS
 - Tries to fetch questions.json; falls back to embedded sample if not found.
 - Tracks user answers, timer, pagination, submit, final score + answer key.
*/

(() => {
  // DOM refs
  const qText = document.getElementById('qText');
  const optionsEl = document.getElementById('options');
  const paginationEl = document.getElementById('pagination');
  const qMeta = document.getElementById('qMeta');
  const progressInfo = document.getElementById('progressInfo');
  const timerEl = document.getElementById('timer');
  const timerAside = document.getElementById('timerAside');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const submitBtn = document.getElementById('submitBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const minsInput = document.getElementById('mins');
  const secsInput = document.getElementById('secs');
  const examArea = document.getElementById('examArea');
  const resultArea = document.getElementById('resultArea');
  const finalScore = document.getElementById('finalScore');
  const scorePercent = document.getElementById('scorePercent');
  const answerKey = document.getElementById('answerKey');
  const reviewBtn = document.getElementById('reviewBtn');
  const restartBtn = document.getElementById('restartBtn');

  // data
  let questions = [];
  let currentIndex = 0;
  let answers = []; // store selected index or null
  let started = false;
  let timer = null;
  let totalSeconds = 0;
  let remainingSeconds = 0;

  // Try to load external questions.json
  async function loadQuestions(){
    try {
      const resp = await fetch('questions.json', {cache: "no-store"});
      if(!resp.ok) throw new Error('no external file');
      const data = await resp.json();
      console.log('Loaded external questions.json');
      return data;
    } catch (e) {
      console.log('Falling back to embedded sample questions');
      const embedded = document.getElementById('sample-questions').textContent;
      return JSON.parse(embedded);
    }
  }

  // Initialise
  async function init(){
    questions = await loadQuestions();
    // basic validation: ensure array and answerIndex present
    if(!Array.isArray(questions) || questions.length===0){
      qText.innerText = 'No questions found in questions.json/sample.';
      return;
    }
    answers = Array(questions.length).fill(null);
    buildPagination();
    renderQuestion(0);
    updateProgress();
    updateTimerDisplay(0);
  }

  function buildPagination(){
    paginationEl.innerHTML = '';
    questions.forEach((q,i)=>{
      const btn = document.createElement('button');
      btn.className = 'page-btn unanswered';
      btn.textContent = i+1;
      btn.title = `Question ${i+1}`;
      btn.addEventListener('click', ()=> {
        if(!started) return;
        renderQuestion(i);
      });
      paginationEl.appendChild(btn);
    });
    updatePaginationStyles();
  }

  function updatePaginationStyles(){
    const nodes = Array.from(paginationEl.children);
    nodes.forEach((btn,i)=>{
      btn.classList.toggle('current', i===currentIndex);
      btn.classList.toggle('answered', answers[i] !== null);
      btn.classList.toggle('unanswered', answers[i] === null);
    });
  }

  function renderQuestion(index){
    currentIndex = index;
    const q = questions[index];
    qText.innerText = `Q${index+1}. ${q.question}`;
    qMeta.innerText = `Question ${index+1} of ${questions.length}`;
    optionsEl.innerHTML = '';
    q.choices.forEach((choice, idx) => {
      const opt = document.createElement('div');
      opt.className = 'option';
      opt.dataset.idx = idx;
      opt.tabIndex = 0;
      opt.innerHTML = `<div style="width:18px;height:18px;border-radius:4px;border:1px solid #ddd;display:inline-block;text-align:center;line-height:18px;font-size:12px">${String.fromCharCode(65+idx)}</div>
                       <div style="flex:1">${choice}</div>`;
      // highlight if already selected
      if(answers[index] === idx) opt.classList.add('selected');
      opt.addEventListener('click', () => {
        if(!started) return;
        answers[index] = idx;
        // visually mark selected
        Array.from(optionsEl.children).forEach(c => c.classList.remove('selected'));
        opt.classList.add('selected');
        updatePaginationStyles();
        updateProgress();
      });
      optionsEl.appendChild(opt);
    });
    updatePaginationStyles();
    updateProgress();
  }

  function updateProgress(){
    const answeredCount = answers.filter(a=>a!==null).length;
    progressInfo.innerText = `Answered ${answeredCount} of ${questions.length}`;
  }

  // Timer functions
  function startTimer(totalSec){
    totalSeconds = totalSec;
    remainingSeconds = totalSec;
    clearInterval(timer);
    timer = setInterval(()=>{
      remainingSeconds--;
      if(remainingSeconds <= 0){
        clearInterval(timer);
        remainingSeconds = 0;
        tick(); // final update
        endExam(true);
      } else {
        tick();
      }
    }, 1000);
    tick();
  }

  function tick(){
    updateTimerDisplay(remainingSeconds);
    // change color when <=30%
    const threshold = Math.ceil(0.3 * totalSeconds);
    const timerNode = timerEl;
    if(remainingSeconds <= threshold){
      timerNode.classList.add('red');
    } else {
      timerNode.classList.remove('red');
    }
  }

  function updateTimerDisplay(sec){
    const mm = String(Math.floor(sec/60)).padStart(2,'0');
    const ss = String(sec%60).padStart(2,'0');
    timerEl.innerText = `${mm}:${ss}`;
    timerAside.innerText = `${mm}:${ss}`;
  }

  // Submit and scoring
  function calculateScore(){
    let correct = 0;
    questions.forEach((q,i)=>{
      if(answers[i] === q.answerIndex) correct++;
    });
    return {correct, total: questions.length, percent: Math.round((correct/questions.length)*100)};
  }

  function showResults(auto=false){
    examArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    const {correct,total,percent} = calculateScore();
    finalScore.innerText = `${correct} / ${total}`;
    scorePercent.innerText = `${percent}%`;

    // Build answer key
    answerKey.innerHTML = '';
    questions.forEach((q,i)=>{
      const row = document.createElement('div');
      row.className = 'result-row';
      const userAnsIdx = answers[i];
      const correctIdx = q.answerIndex;
      const isCorrect = userAnsIdx === correctIdx;
      const userAnsText = userAnsIdx === null ? `<em style="color:#7f1d1d">No answer</em>` : `${String.fromCharCode(65+userAnsIdx)}. ${q.choices[userAnsIdx]}`;
      const correctText = `${String.fromCharCode(65+correctIdx)}. ${q.choices[correctIdx]}`;
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">Q${i+1}. ${q.question}</div>
          <div style="font-weight:700;color:${isCorrect ? '#065f46' : '#7f1d1d'}">${isCorrect ? 'Correct' : 'Wrong'}</div>
        </div>
        <div style="margin-top:8px">
          <div class="small">Your answer: ${userAnsText}</div>
          <div class="small" style="margin-top:4px">Correct answer: <strong>${correctText}</strong></div>
          ${q.explanation ? `<div style="margin-top:8px" class="small"><em>Explanation:</em> ${q.explanation}</div>` : ''}
        </div>
      `;
      answerKey.appendChild(row);
    });

    // scroll to top
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function endExam(auto=false){
    // lock interactions
    started = false;
    clearInterval(timer);
    // We will present final score page and answer key.
    showResults(auto);
  }

  // Event listeners
  startBtn.addEventListener('click', ()=>{
    if(started) return;
    // set time
    const m = parseInt(minsInput.value) || 0;
    const s = parseInt(secsInput.value) || 0;
    const total = m*60 + s;
    if(total <= 0){
      alert('Please set a time greater than 0 seconds.');
      return;
    }
    started = true;
    examArea.classList.remove('hidden');
    resultArea.classList.add('hidden');
    // enable navigation etc
    renderQuestion(0);
    updatePaginationStyles();
    startTimer(total);
    // disable time inputs once started
    minsInput.disabled = true; secsInput.disabled = true;
  });

  resetBtn.addEventListener('click', ()=>{
    clearInterval(timer);
    started = false;
    answers = Array(questions.length).fill(null);
    currentIndex = 0;
    minsInput.disabled = false; secsInput.disabled = false;
    const m = parseInt(minsInput.value) || 0;
    const s = parseInt(secsInput.value) || 0;
    totalSeconds = m*60 + s;
    remainingSeconds = totalSeconds;
    updateTimerDisplay(remainingSeconds);
    buildPagination();
    renderQuestion(0);
    examArea.classList.remove('hidden');
    resultArea.classList.add('hidden');
  });

  prevBtn.addEventListener('click', ()=>{
    if(currentIndex > 0) renderQuestion(currentIndex-1);
  });
  nextBtn.addEventListener('click', ()=>{
    if(currentIndex < questions.length-1) renderQuestion(currentIndex+1);
  });

  submitBtn.addEventListener('click', ()=>{
    if(!started){
      // still allow manual submission before starting?
      if(confirm('Exam has not started — do you still want to submit current answers?')){
        endExam(false);
      }
      return;
    }
    if(!confirm('Submit exam now? You will not be able to change answers.')) return;
    endExam(false);
  });

  reviewBtn.addEventListener('click', ()=>{
    // show review in place of results: present answers page already shown. We'll scroll.
    window.scrollTo({top:0, behavior:'smooth'});
  });

  restartBtn.addEventListener('click', ()=>{
    // reset everything to initial
    clearInterval(timer);
    started = false;
    answers = Array(questions.length).fill(null);
    currentIndex = 0;
    minsInput.disabled = false; secsInput.disabled = false;
    buildPagination();
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
