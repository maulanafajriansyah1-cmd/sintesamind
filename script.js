/* SintesaMind — interaksi halaman */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const safeGet = (key, fallback = null) => {
    try { const value = localStorage.getItem(key); return value === null ? fallback : value; }
    catch { return fallback; }
  };
  const safeSet = (key, value) => {
    try { localStorage.setItem(key, value); return true; }
    catch { showToast('Penyimpanan browser tidak tersedia. Coba gunakan browser biasa.'); return false; }
  };
  const safeRemove = key => { try { localStorage.removeItem(key); return true; } catch { return false; } };
  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  $('#year').textContent = new Date().getFullYear();

  // Menu navigasi untuk layar kecil
  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.innerHTML = isOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
    $$('#navLinks a').forEach(link => link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }));
  }

  // Pencarian: menyaring kartu konten tanpa merusak display grid/flex.
  const searchInput = $('#searchInput');
  const emptySearch = $('#emptySearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.trim().toLocaleLowerCase('id');
      const cards = $$('.searchable, #postsContainer .post-card');
      let visibleCount = 0;
      cards.forEach(card => {
        const match = !term || card.textContent.toLocaleLowerCase('id').includes(term);
        card.hidden = !match;
        if (match) visibleCount++;
      });
      if (emptySearch) emptySearch.hidden = !term || visibleCount > 0;
    });
  }

  // Modal curhat
  const modal = $('#curhatModal');
  const curhatForm = $('#curhatForm');
  let lastFocused = null;
  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => $('#userRole')?.focus(), 30);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    curhatForm?.reset();
    $('#charCount').textContent = '0';
    lastFocused?.focus?.();
  }
  $$('.open-modal-btn').forEach(btn => btn.addEventListener('click', openModal));
  $('#closeModalBtn')?.addEventListener('click', closeModal);
  $('#cancelModalBtn')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.classList.contains('active')) closeModal(); });
  $('#postContent')?.addEventListener('input', e => { $('#charCount').textContent = String(e.target.value.length); });

  // Forum lokal. Teks dari pengguna dimasukkan melalui textContent agar HTML tidak dieksekusi.
  const postsContainer = $('#postsContainer');
  const postKey = 'sintesa_posts_v2';
  function getPosts() {
    try { return JSON.parse(safeGet(postKey, '[]')) || []; } catch { return []; }
  }
  function makeForumPost(post, isExample = false) {
    const article = document.createElement('article');
    article.className = 'post-card forum-post';
    const top = document.createElement('div'); top.className = 'post-top';
    const avatar = document.createElement('div'); avatar.className = 'avatar-anon'; avatar.textContent = (post.role || 'T').slice(0, 1).toUpperCase();
    const author = document.createElement('div'); author.className = 'post-author';
    const name = document.createElement('strong'); name.textContent = post.role || 'Teman Sintesa';
    const meta = document.createElement('small'); meta.textContent = `${isExample ? 'Contoh cerita' : 'Tersimpan di perangkat ini'} · ${post.category || 'Lainnya'}`;
    author.append(name, meta);
    const category = document.createElement('span'); category.className = 'category-pill'; category.textContent = post.category || 'Lainnya';
    top.append(avatar, author, category);
    const content = document.createElement('p'); content.className = 'post-content'; content.textContent = post.content || '';
    const footer = document.createElement('div'); footer.className = 'post-footer';
    const like = document.createElement('button'); like.className = 'action-btn like-btn'; like.type = 'button'; like.innerHTML = '<i class="fa-regular fa-heart"></i> <span>0</span> Dukungan'; like.setAttribute('aria-label', 'Beri dukungan');
    like.addEventListener('click', () => {
      const liked = like.classList.toggle('liked');
      like.querySelector('span').textContent = liked ? '1' : '0';
      like.querySelector('i').className = liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    });
    const note = document.createElement('span'); note.className = 'muted small'; note.innerHTML = '<i class="fa-regular fa-comment"></i> Diskusi suportif';
    footer.append(like, note); article.append(top, content, footer);
    return article;
  }
  function renderSavedPosts() {
    if (!postsContainer) return;
    getPosts().slice().reverse().forEach(post => postsContainer.prepend(makeForumPost(post)));
  }
  renderSavedPosts();
  curhatForm?.addEventListener('submit', e => {
    e.preventDefault();
    const content = $('#postContent').value.trim();
    if (!content) { showToast('Isi cerita terlebih dahulu.'); return; }
    const post = { role: $('#userRole').value, category: $('#postCategory').value, content, createdAt: new Date().toISOString() };
    const posts = getPosts();
    posts.push(post);
    if (!safeSet(postKey, JSON.stringify(posts))) return;
    postsContainer?.prepend(makeForumPost(post));
    closeModal();
    showToast('Cerita ditambahkan di browser ini.');
  });

  // Mood tracker
  const moodKey = 'sintesa_mood_today';
  const moodStatus = $('#moodStatus');
  const savedMood = safeGet(moodKey);
  if (savedMood) {
    const selected = $$('.mood-btn').find(btn => btn.dataset.mood === savedMood);
    if (selected) selected.setAttribute('aria-pressed', 'true');
    if (moodStatus) moodStatus.textContent = `Check-in hari ini: ${savedMood}.`;
  }
  $$('.mood-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.mood-btn').forEach(item => item.setAttribute('aria-pressed', String(item === btn)));
    safeSet(moodKey, btn.dataset.mood);
    if (moodStatus) moodStatus.textContent = `Terima kasih sudah check-in. Perasaanmu hari ini: ${btn.dataset.mood}.`;
  }));

  // Latihan napas: tiga siklus, tanpa interval yang tumpang tindih.
  const breathCircle = $('#breathCircle');
  const startBreathBtn = $('#startBreathBtn');
  const breathHint = $('#breathHint');
  let breathing = false;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function runBreathing() {
    if (breathing || !breathCircle || !startBreathBtn) return;
    breathing = true; startBreathBtn.disabled = true;
    const phases = [
      { label: 'Tarik napas', className: 'inhale', duration: 3500, hint: 'Tarik napas perlahan jika terasa nyaman.' },
      { label: 'Tahan lembut', className: 'hold', duration: 1500, hint: 'Tahan sebentar hanya jika nyaman; boleh lewati.' },
      { label: 'Hembuskan', className: 'exhale', duration: 4000, hint: 'Hembuskan napas secara perlahan.' }
    ];
    try {
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const phase of phases) {
          breathCircle.textContent = phase.label;
          breathCircle.className = `breath-circle ${phase.className}`;
          if (breathHint) breathHint.textContent = `Putaran ${cycle + 1} dari 3. ${phase.hint}`;
          await sleep(phase.duration);
        }
      }
      breathCircle.className = 'breath-circle';
      breathCircle.textContent = 'Selesai';
      if (breathHint) breathHint.textContent = 'Bagus sudah memberi jeda untuk diri sendiri.';
    } finally {
      breathing = false; startBreathBtn.disabled = false;
      setTimeout(() => { if (!breathing) { breathCircle.className = 'breath-circle'; breathCircle.textContent = 'Siap?'; } }, 2200);
    }
  }
  startBreathBtn?.addEventListener('click', runBreathing);

  // Grounding 5-4-3-2-1
  const steps = [
    { icon: 'fa-eye', title: '5 hal yang bisa kamu lihat', desc: 'Amati lima benda yang bisa kamu lihat di sekitarmu.' },
    { icon: 'fa-hand', title: '4 hal yang bisa kamu rasakan', desc: 'Sadari empat sensasi sentuhan, misalnya kaki menyentuh lantai atau kain di tangan.' },
    { icon: 'fa-ear-listen', title: '3 hal yang bisa kamu dengar', desc: 'Dengarkan tiga suara di sekitar, baik dekat maupun jauh.' },
    { icon: 'fa-mug-hot', title: '2 aroma yang bisa kamu cium', desc: 'Perhatikan dua aroma di sekitar jika memungkinkan. Tidak perlu mencari aroma yang kuat.' },
    { icon: 'fa-heart', title: '1 hal baik untuk dirimu', desc: 'Sebutkan satu hal kecil yang kamu hargai atau ingin lakukan untuk merawat diri.' }
  ];
  let currentStep = 0;
  const nextGBtn = $('#nextGroundingBtn'), prevGBtn = $('#prevGroundingBtn');
  function updateGrounding() {
    const step = steps[currentStep];
    $('#groundingStepBadge').textContent = `Langkah ${currentStep + 1} dari 5`;
    $('#stepIcon').innerHTML = `<i class="fa-solid ${step.icon}" aria-hidden="true"></i>`;
    $('#stepTitle').textContent = step.title;
    $('#stepDesc').textContent = step.desc;
    prevGBtn.disabled = currentStep === 0;
    nextGBtn.innerHTML = currentStep === steps.length - 1 ? 'Selesai <i class="fa-solid fa-check"></i>' : 'Lanjut <i class="fa-solid fa-arrow-right"></i>';
  }
  nextGBtn?.addEventListener('click', () => {
    if (currentStep < steps.length - 1) currentStep++;
    else { currentStep = 0; showToast('Grounding selesai. Terima kasih sudah mencoba.'); }
    updateGrounding();
  });
  prevGBtn?.addEventListener('click', () => { if (currentStep > 0) currentStep--; updateGrounding(); });

  // Jurnal: PIN adalah pengunci UI saja, bukan enkripsi. Simpan teks lokal.
  const journal = $('#journalContent');
  const pinArea = $('#pinArea');
  const pinKey = 'sintesa_journal_pin_v2';
  const journalKey = 'sintesa_journal_data_v2';
  let journalUnlocked = !safeGet(pinKey);
  if (journal) {
    journal.value = safeGet(journalKey, '') || '';
    journal.readOnly = !journalUnlocked;
    if (!journalUnlocked) pinArea.hidden = false;
  }
  $('#lockJournalBtn')?.addEventListener('click', () => {
    const existing = safeGet(pinKey);
    if (!existing) {
      const pin = prompt('Buat PIN 4 digit angka untuk mengunci tampilan jurnal:');
      if (pin === null) return;
      if (!/^\d{4}$/.test(pin)) { showToast('PIN harus terdiri dari tepat 4 angka.'); return; }
      if (safeSet(pinKey, pin)) {
        journalUnlocked = false; journal.readOnly = true; pinArea.hidden = false;
        $('#pinInput').value = ''; $('#pinError').textContent = '';
        showToast('PIN dibuat. Jurnal terkunci di tampilan ini.');
      }
    } else {
      journalUnlocked = false; journal.readOnly = true; pinArea.hidden = false;
      $('#pinInput').value = ''; $('#pinError').textContent = '';
      showToast('Jurnal dikunci.');
    }
  });
  $('#submitPinBtn')?.addEventListener('click', () => {
    if ($('#pinInput').value === safeGet(pinKey)) {
      journalUnlocked = true; journal.readOnly = false; pinArea.hidden = true;
      $('#pinError').textContent = ''; journal.focus(); showToast('Jurnal terbuka.');
    } else { $('#pinError').textContent = 'PIN belum sesuai. Coba lagi.'; }
  });
  $('#pinInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') $('#submitPinBtn').click(); });
  $('#saveJournalBtn')?.addEventListener('click', () => {
    if (!journalUnlocked) { showToast('Buka jurnal dengan PIN terlebih dahulu.'); return; }
    if (safeSet(journalKey, journal.value)) { $('#saveStatus').textContent = 'Catatan tersimpan di browser ini.'; setTimeout(() => $('#saveStatus').textContent = '', 3000); }
  });
  $('#clearJournalBtn')?.addEventListener('click', () => {
    if (!journalUnlocked) { showToast('Buka jurnal dengan PIN terlebih dahulu.'); return; }
    if (confirm('Hapus seluruh isi jurnal yang tersimpan di browser ini?')) {
      journal.value = ''; safeRemove(journalKey); $('#saveStatus').textContent = 'Catatan dihapus.';
    }
  });

  // Tes refleksi sederhana. Bukan instrumen diagnosis klinis.
  const questions = [
    'Dalam 7 hari terakhir, seberapa sering kamu merasa sulit untuk rileks?',
    'Dalam 7 hari terakhir, seberapa sering kamu merasa khawatir atau cemas?',
    'Seberapa sering kamu merasa kewalahan oleh tugas atau tanggung jawab?',
    'Seberapa sering perasaanmu mengganggu konsentrasi saat belajar atau bekerja?',
    'Seberapa sering kamu merasa sulit beristirahat meskipun punya waktu luang?'
  ];
  let qIdx = 0;
  const answers = Array(questions.length).fill(null);
  const optionLabels = ['Tidak pernah', 'Kadang-kadang', 'Sering', 'Hampir selalu'];
  const optionsGroup = $('#optionsGroup');
  function renderQuestion() {
    $('#questionText').textContent = questions[qIdx];
    $('#screeningProgress').textContent = `Soal ${qIdx + 1} dari ${questions.length}`;
    $('#quizPercent').textContent = `${Math.round(((qIdx + 1) / questions.length) * 100)}%`;
    $('#quizProgressBar').style.width = `${((qIdx + 1) / questions.length) * 100}%`;
    $$('.option-btn', optionsGroup).forEach((btn, i) => {
      btn.classList.toggle('selected', answers[qIdx] === i);
      btn.setAttribute('aria-pressed', String(answers[qIdx] === i));
    });
    $('#prevQuestionBtn').disabled = qIdx === 0;
    $('#nextQuestionBtn').disabled = answers[qIdx] === null;
    $('#nextQuestionBtn').innerHTML = qIdx === questions.length - 1 ? 'Lihat refleksi <i class="fa-solid fa-arrow-right"></i>' : 'Berikutnya <i class="fa-solid fa-arrow-right"></i>';
  }
  optionsGroup?.addEventListener('click', e => {
    const btn = e.target.closest('.option-btn');
    if (!btn) return;
    answers[qIdx] = Number(btn.dataset.score);
    renderQuestion();
  });
  $('#prevQuestionBtn')?.addEventListener('click', () => { if (qIdx > 0) { qIdx--; renderQuestion(); } });
  $('#nextQuestionBtn')?.addEventListener('click', () => {
    if (answers[qIdx] === null) return;
    if (qIdx < questions.length - 1) { qIdx++; renderQuestion(); return; }
    const score = answers.reduce((sum, value) => sum + value, 0);
    let title, desc;
    if (score <= 4) { title = 'Check-in: keluhan yang dilaporkan relatif sedikit'; desc = 'Dari jawabanmu, kamu melaporkan sedikit pengalaman yang ditanyakan. Tetap rawat diri dan perhatikan perubahan kondisi dari waktu ke waktu.'; }
    else if (score <= 9) { title = 'Check-in: mungkin perlu jeda dan dukungan'; desc = 'Jawabanmu menunjukkan beberapa pengalaman yang mungkin terasa membebani. Pertimbangkan jeda, berbagi dengan orang tepercaya, dan mencari bantuan jika diperlukan.'; }
    else { title = 'Check-in: pertimbangkan mencari dukungan'; desc = 'Jawabanmu menunjukkan pengalaman yang cukup sering dirasakan. Kamu tidak harus menghadapinya sendirian; pertimbangkan menghubungi orang tepercaya atau tenaga profesional.'; }
    $('#resultTitle').textContent = title; $('#resultDesc').textContent = desc;
    $('#quizContainer').hidden = true; $('#resultContainer').hidden = false;
    $('#quizProgressBar').style.width = '100%'; $('#quizPercent').textContent = 'Selesai';
  });
  $('#restartQuizBtn')?.addEventListener('click', () => {
    qIdx = 0; answers.fill(null); $('#quizContainer').hidden = false; $('#resultContainer').hidden = true; renderQuestion();
  });
  renderQuestion();

  // Forum contoh like button
  $$('.like-btn').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {});
    btn.classList.add('liked');
    const count = $('span', btn);
    if (count) count.textContent = String((Number(count.textContent) || 0) + 1);
    const icon = $('i', btn); if (icon) icon.className = 'fa-solid fa-heart';
  }));

  // Artikel edukasi dibuka dalam modal sederhana berbasis dialog yang sama.
  $$('.article-more').forEach(button => button.addEventListener('click', () => {
    const title = button.dataset.title || 'Informasi';
    const body = button.dataset.body || '';
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay active'; overlay.setAttribute('role', 'presentation');
    const card = document.createElement('section'); card.className = 'modal-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true');
    const heading = document.createElement('div'); heading.className = 'modal-heading';
    const h = document.createElement('h2'); h.textContent = title;
    const close = document.createElement('button'); close.className = 'icon-button'; close.type = 'button'; close.setAttribute('aria-label', 'Tutup'); close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    heading.append(h, close);
    const p = document.createElement('p'); p.textContent = body;
    const ok = document.createElement('button'); ok.className = 'btn btn-primary'; ok.type = 'button'; ok.textContent = 'Tutup';
    const closeIt = () => overlay.remove();
    close.addEventListener('click', closeIt); ok.addEventListener('click', closeIt); overlay.addEventListener('click', e => { if (e.target === overlay) closeIt(); });
    card.append(heading, p, ok); overlay.append(card); document.body.append(overlay); close.focus();
  }));

  // Chatbot berbasis pilihan (bukan AI dan tidak mengirim pesan ke internet).
  const chatbotToggle = $('#chatbotToggleBtn'), chatbotWindow = $('#chatbotWindow'), chatbotMessages = $('#chatbotMessages');
  const replies = {
    cemas: 'Coba berhenti sejenak dan rasakan kaki menyentuh lantai. Jika nyaman, lakukan latihan pernapasan atau grounding di halaman ini. Kamu boleh berhenti kapan saja jika tidak nyaman.',
    burnout: 'Coba pilih satu tugas kecil, ambil jeda, dan turunkan target menjadi langkah yang realistis. Beristirahat bukan berarti gagal.',
    dukungan: 'Kamu boleh mulai dengan cerita singkat kepada orang yang kamu percaya. Misalnya: “Aku lagi berat akhir-akhir ini. Bisa temani aku sebentar?”',
    bantuan: 'Jika ada bahaya langsung atau keadaan darurat medis, hubungi layanan darurat setempat (119 di Indonesia sesuai ketersediaan wilayah) dan orang tepercaya. SintesaMind bukan layanan krisis.'
  };
  function addChatBubble(text, className) { const bubble = document.createElement('div'); bubble.className = className; bubble.textContent = text; chatbotMessages.append(bubble); chatbotMessages.scrollTop = chatbotMessages.scrollHeight; }
  function toggleChatbot(force) {
    const open = typeof force === 'boolean' ? force : chatbotWindow.hidden;
    chatbotWindow.hidden = !open; chatbotToggle.setAttribute('aria-expanded', String(open));
    chatbotToggle.setAttribute('aria-label', open ? 'Tutup SintesaBot' : 'Buka SintesaBot');
    chatbotToggle.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-comment-dots"></i>';
  }
  chatbotToggle?.addEventListener('click', () => toggleChatbot());
  $('#closeChatbotBtn')?.addEventListener('click', () => toggleChatbot(false));
  $('#chatbotOptions')?.addEventListener('click', e => {
    const btn = e.target.closest('.chat-opt-btn');
    if (!btn) return;
    addChatBubble(btn.textContent.trim(), 'user-msg-bubble');
    setTimeout(() => addChatBubble(replies[btn.dataset.reply] || 'Coba cari satu langkah kecil yang terasa aman untuk dilakukan saat ini.', 'bot-msg-bubble'), 250);
  });
});
