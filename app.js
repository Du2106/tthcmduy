// Xử lý tương tác cho Không gian Học liệu số Tư tưởng Hồ Chí Minh
// Đậm đà Bản sắc Văn hóa Truyền thống Việt Nam & Chuyên đề Bác Hồ với Thành phố Hoa Phượng Đỏ Hải Phòng

(function () {
  const DATA = window.TTHCM_DATA;
  const STORAGE_KEY = "tthcm_hai_phong_book_v2";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let currentChapterIndex = 0;
  let currentQuizIndex = 0;
  let quizScore = 0;
  let quizAnswered = {};
  let currentHaiPhongFilter = "tat-ca";

  // Khôi phục dữ liệu sách tùy chỉnh (nếu có)
  function loadSavedBookPages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 1) {
        DATA.bookPages = parsed;
      }
    } catch (err) {
      console.warn("Không thể đọc dữ liệu sách đã lưu:", err);
    }
  }

  // Chuyển đổi chế độ Sắc nền Sơn mài Tối / Giấy dó Sáng
  window.toggleTheme = function () {
    const isLight = document.body.classList.toggle("theme-light");
    const labelEl = document.getElementById("theme-toggle-label");
    if (labelEl) {
      labelEl.textContent = isLight ? "☾ Sắc nền tối" : "☀ Sắc nền sáng";
    }
  };

  // Biểu tượng Bông Hoa Phượng Đỏ 5 cánh thu nhỏ (SVG) dùng cho thẻ Hải Phòng
  function createMiniPhuongSvg() {
    return `<svg class="w-5 h-5 shrink-0 inline-block" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <g transform="translate(18, 19)">
        <path d="M0 0 C-4 -8, -14 -13, -15 -6 C-16 0, -8 2, 0 0 Z" fill="#ee1c25"/>
        <path d="M0 0 C5 -8, 15 -12, 16 -5 C16 1, 8 2, 0 0 Z" fill="#dc2626"/>
        <path d="M0 0 C-8 4, -16 10, -11 15 C-6 19, -1 9, 0 0 Z" fill="#dc2626"/>
        <path d="M0 0 C8 4, 16 10, 11 15 C6 19, 1 9, 0 0 Z" fill="#b91c1c"/>
        <path d="M0 0 C-5 -10, -5 -18, 0 -19 C5 -18, 5 -10, 0 0 Z" fill="#ef4444" stroke="#fde68a" stroke-width="0.9"/>
        <circle cx="0" cy="0" r="2.6" fill="#fef08a" stroke="#991b1b" stroke-width="1"/>
      </g>
    </svg>`;
  }

  // Tạo tranh khắc truyền thống dự phòng khi mạng chậm (100% Tiếng Việt)
  function createFallbackSvgDataUri(page) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 540" width="800" height="540">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#5a0f0f"/>
          <stop offset="55%" stop-color="#8b1818"/>
          <stop offset="100%" stop-color="#5c280b"/>
        </linearGradient>
      </defs>
      <rect width="800" height="540" fill="url(#bg)"/>
      <rect x="24" y="24" width="752" height="492" fill="none" stroke="#fbbf24" stroke-width="2" stroke-opacity="0.55" rx="20"/>
      <circle cx="400" cy="215" r="78" fill="#fbbf24" fill-opacity="0.14" stroke="#fbbf24" stroke-width="1.5" stroke-opacity="0.5"/>
      <polygon points="400,152 417,196 464,196 426,223 440,268 400,241 360,268 374,223 336,196 383,196" fill="#fbbf24"/>
      <text x="400" y="345" text-anchor="middle" fill="#fef3c7" font-family="Be Vietnam Pro, Segoe UI, sans-serif" font-size="28" font-weight="800">${escapeXml(
        page.dateBadge
      )}</text>
      <text x="400" y="388" text-anchor="middle" fill="#ffffff" font-family="Be Vietnam Pro, Segoe UI, sans-serif" font-size="22" font-weight="700">${escapeXml(
        page.title.slice(0, 48)
      )}${page.title.length > 48 ? "..." : ""}</text>
      <text x="400" y="432" text-anchor="middle" fill="#fde68a" font-family="Be Vietnam Pro, Segoe UI, sans-serif" font-size="16">${escapeXml(
        page.location
      )}</text>
      <text x="400" y="482" text-anchor="middle" fill="#fed7aa" font-family="Be Vietnam Pro, Segoe UI, sans-serif" font-size="13" letter-spacing="2">TƯ LIỆU LỊCH SỬ HỒ CHÍ MINH • TRANG ${
        page.pageNumber < 10 ? "0" + page.pageNumber : page.pageNumber
      }</text>
    </svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function escapeXml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  // ==================== 01. HIỂN THỊ DANH XƯNG QUA CÁC THỜI KỲ ====================
  function renderDanhXung() {
    const gridEl = document.getElementById("danh-xung-grid");
    if (!gridEl || !DATA.danhXung) return;

    gridEl.innerHTML = DATA.danhXung
      .map(
        (item) => `
      <article class="ximi-card p-6 sm:p-7 flex flex-col justify-between space-y-5 group">
        <div class="space-y-3.5">
          <div class="flex items-center justify-between border-b border-white/10 pb-3.5">
            <span class="font-mono-code text-xs font-extrabold text-[#ee1c25] tracking-widest">
              DANH XƯNG THỨ ${item.index}
            </span>
            <span class="font-mono-code text-[11px] font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/25 px-3 py-1">
              ${item.period}
            </span>
          </div>

          <h3 class="text-xl sm:text-2xl font-extrabold group-hover:text-[#ee1c25] transition-colors">
            ${item.name}
          </h3>

          <p class="text-xs font-medium text-amber-300/90 flex items-center gap-1.5">
            <span>📍</span>
            <span>${item.place}</span>
          </p>

          <p class="text-sm text-stone-300 leading-relaxed">
            ${item.meaning}
          </p>
        </div>

        <div class="pt-3.5 border-t border-white/10 text-xs text-stone-400">
          <strong class="text-amber-400 uppercase tracking-wider block mb-1 font-mono-code text-[10px]">
            ★ Dấu ấn lịch sử dân tộc:
          </strong>
          ${item.milestone}
        </div>
      </article>
    `
      )
      .join("");
  }

  // ==================== 02. BIÊN NIÊN SỬ ====================
  function renderTimeline() {
    const list = document.getElementById("timeline-milestones");
    const pages = DATA.bookPages;
    if (!list || !pages.length) return;

    const compact = window.matchMedia("(max-width: 767px)");
    const header = document.querySelector(".site-header");
    const yearOf = (page) => page.timelineYear || page.dateBadge.match(/\b\d{4}\b/)?.[0] || page.period;
    list.innerHTML = pages.map((page, index) => `
      <li>
        <button class="timeline-milestone" type="button" data-index="${index}"
          aria-controls="timeline-detail-${index}" aria-pressed="false">
          <span class="timeline-meta">
            <strong class="timeline-year">${escapeHtml(yearOf(page))}</strong>
            <span class="timeline-location">${escapeHtml(page.location)}</span>
          </span>
          <strong class="timeline-milestone-title">${escapeHtml(page.timelineTitle || page.title)}</strong>
          <span class="timeline-summary">${escapeHtml(page.story[0])}</span>
        </button>
        <article id="timeline-detail-${index}" class="timeline-detail" aria-labelledby="timeline-title-${index}" tabindex="0">
          <div class="timeline-detail-content">
            <header class="timeline-detail-header">
              <span class="timeline-period">Giai đoạn ${escapeHtml(page.period)}</span>
              <div class="timeline-meta">
                <span class="timeline-detail-year">${escapeHtml(yearOf(page))}</span>
                <span class="timeline-location">${escapeHtml(page.location)}</span>
              </div>
            </header>
            <h3 id="timeline-title-${index}">${escapeHtml(page.timelineTitle || page.title)}</h3>
            ${page.story.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
            <blockquote>${escapeHtml(page.quote)}</blockquote>
            <p><strong>Ý nghĩa lịch sử.</strong> ${escapeHtml(page.significance)}</p>
            <figure class="timeline-photo">
              <img alt="" decoding="async" loading="lazy">
              <figcaption>${escapeHtml(page.imageCaption)}</figcaption>
            </figure>
          </div>
        </article>
      </li>
    `).join("");

    const buttons = Array.from(list.querySelectorAll(".timeline-milestone"));
    const details = Array.from(list.querySelectorAll(".timeline-detail"));
    details.forEach((detail, index) => {
      const page = pages[index];
      const image = detail.querySelector("img");
      image.addEventListener("error", () => { image.src = createFallbackSvgDataUri(page); }, { once: true });
      image.src = page.imageUrl || createFallbackSvgDataUri(page);
    });

    let activeIndex = 0;
    let scrollIndex = 0;
    let frame = 0;
    function positionDetail() {
      const detail = details[activeIndex];
      if (compact.matches) {
        buttons[activeIndex].after(detail);
      } else {
        list.after(detail);
        detail.scrollTop = 0;
      }
    }

    function selectMilestone(index) {
      if (index === activeIndex) return;
      buttons[activeIndex].setAttribute("aria-pressed", "false");
      if (!compact.matches) buttons[activeIndex].after(details[activeIndex]);
      activeIndex = index;
      buttons[index].setAttribute("aria-pressed", "true");
      positionDetail();
    }

    function syncMilestoneWithScroll() {
      frame = 0;
      const readingLine = (header?.offsetHeight || 0) + 32;
      const bounds = list.getBoundingClientRect();
      if (bounds.top > window.innerHeight || bounds.bottom < readingLine) return;
      const passed = buttons.findLastIndex((button) => button.getBoundingClientRect().top <= readingLine);
      const index = Math.max(0, passed);
      if (index === scrollIndex) return;
      scrollIndex = index;
      selectMilestone(index);
    }

    function scheduleMilestoneSync() {
      if (!frame) frame = window.requestAnimationFrame(syncMilestoneWithScroll);
    }

    buttons[0].setAttribute("aria-pressed", "true");
    positionDetail();
    compact.addEventListener("change", () => {
      positionDetail();
      scheduleMilestoneSync();
    });
    window.addEventListener("scroll", scheduleMilestoneSync, { passive: true });
    window.addEventListener("resize", scheduleMilestoneSync);
    scheduleMilestoneSync();

    list.addEventListener("click", (event) => {
      const button = event.target.closest(".timeline-milestone");
      if (!button) return;
      selectMilestone(Number(button.dataset.index));
      if (compact.matches) {
        const detail = details[activeIndex];
        detail.focus({ preventScroll: true });
        detail.scrollIntoView({ block: "start" });
      }
    });
  }

  // ==================== 03. DI SẢN VĂN KIỆN KINH ĐIỂN ====================
  function renderClassicWorks() {
    const container = document.getElementById("classic-works-grid");
    if (!container || !DATA.classicWorks) return;

    container.innerHTML = DATA.classicWorks
      .map(
        (w, i) => `
      <a class="ximi-card work-card p-6 sm:p-7 flex flex-col justify-between gap-5" data-work-index="${i}"
        href="${escapeHtml(w.fullTextUrl)}" target="_blank" rel="noopener noreferrer">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <span class="font-mono-code text-xs font-extrabold text-[#ee1c25] px-3 py-1 bg-[#ee1c25]/10 border border-[#ee1c25]/25">
              TÁC PHẨM 0${i + 1} • ${w.year}
            </span>
            <span class="text-xs text-amber-400/90 italic text-right">${w.original}</span>
          </div>
          <h3 class="text-lg font-extrabold">${w.title}</h3>
          <p class="text-xs sm:text-sm text-stone-300 leading-relaxed">${w.significance}</p>
        </div>
        <span class="work-card-link">Đọc chi tiết <span aria-hidden="true">→</span></span>
      </a>
    `
      )
      .join("");

    const reader = document.getElementById("work-reader");
    if (typeof reader?.showModal !== "function") return;

    container.querySelectorAll("[data-work-index]").forEach((card) => {
      card.setAttribute("aria-haspopup", "dialog");
    });
    const title = document.getElementById("work-reader-title");
    const meta = document.getElementById("work-reader-meta");
    const content = document.getElementById("work-reader-content");
    const source = document.getElementById("work-reader-source");
    const previous = document.getElementById("work-reader-prev");
    const next = document.getElementById("work-reader-next");
    const pageLabel = document.getElementById("work-reader-page");
    let pages = [];
    let pageIndex = 0;
    let turningPage;

    function showPage(index) {
      const [heading, paragraph] = pages[index];
      pageIndex = index;
      content.innerHTML = `
        <section>
          <h3>${escapeHtml(heading)}</h3>
          <p>${escapeHtml(paragraph)}</p>
        </section>
      `;
      content.scrollTop = 0;
      pageLabel.textContent = `Trang ${index + 1} / ${pages.length}`;
      previous.setAttribute("aria-disabled", String(index === 0));
      next.setAttribute("aria-disabled", String(index === pages.length - 1));
    }

    function turnPage(direction) {
      const destination = pageIndex + direction;
      if (destination < 0 || destination >= pages.length) return;
      turningPage?.remove();
      if (reducedMotion.matches || typeof content.animate !== "function") {
        showPage(destination);
        return;
      }

      const leaf = content.cloneNode(true);
      leaf.removeAttribute("id");
      leaf.removeAttribute("tabindex");
      leaf.setAttribute("aria-hidden", "true");
      leaf.classList.add("work-reader-leaf");
      leaf.style.transformOrigin = direction > 0 ? "left center" : "right center";
      content.after(leaf);
      leaf.scrollTop = content.scrollTop;
      turningPage = leaf;
      showPage(destination);

      const animation = leaf.animate([
        { transform: "rotateY(0deg)", opacity: 1 },
        { transform: `rotateY(${direction * -88}deg)`, opacity: 0.18 }
      ], { duration: 440, easing: "cubic-bezier(0.35, 0, 0.22, 1)" });
      animation.addEventListener("finish", () => {
        leaf.remove();
        if (turningPage === leaf) turningPage = undefined;
      });
    }

    previous.addEventListener("click", () => turnPage(-1));
    next.addEventListener("click", () => turnPage(1));
    reader.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        turnPage(event.key === "ArrowLeft" ? -1 : 1);
      }
    });
    reader.addEventListener("close", () => {
      turningPage?.remove();
      turningPage = undefined;
    });

    container.addEventListener("click", (event) => {
      const card = event.target.closest("[data-work-index]");
      if (!card || !isPlainClick(event)) return;

      event.preventDefault();
      const work = DATA.classicWorks[Number(card.dataset.workIndex)];
      title.textContent = work.title;
      meta.textContent = `${work.year} · ${work.original}`;
      pages = [["Giới thiệu", work.significance], ...work.readingNotes];
      source.href = work.fullTextUrl;
      reader.showModal();
      showPage(0);
    });
  }

  // ==================== 04. BÁC HỒ VỚI HẢI PHÒNG — THÀNH PHỐ HOA PHƯỢNG ĐỎ ====================
  function renderHaiPhongStats() {
    const statsGrid = document.getElementById("hai-phong-stats-grid");
    if (!statsGrid || !DATA.haiPhongSection?.stats) return;

    statsGrid.innerHTML = DATA.haiPhongSection.stats
      .map(
        (s) => `
      <div class="phuong-stat-box space-y-1">
        <div class="flex items-center gap-2">
          ${createMiniPhuongSvg()}
          <span class="text-xl sm:text-2xl font-black text-amber-300">${s.number}</span>
        </div>
        <div class="text-xs sm:text-sm font-bold text-white">${s.label}</div>
        <p class="text-xs text-stone-300 leading-relaxed">${s.detail}</p>
      </div>
    `
      )
      .join("");
  }

  function renderHaiPhongVisits(filterCategory = "tat-ca") {
    const gridEl = document.getElementById("hai-phong-visits-grid");
    if (!gridEl || !DATA.haiPhongSection?.nineVisits) return;

    const visits = DATA.haiPhongSection.nineVisits.filter((v) =>
      filterCategory === "tat-ca" ? true : v.category === filterCategory
    );

    gridEl.innerHTML = visits
      .map(
        (v) => `
      <article class="ximi-card p-6 sm:p-7 flex flex-col justify-between space-y-5 group border border-red-500/20">
        <div class="space-y-3.5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
            <span class="inline-flex items-center gap-1.5 font-mono-code text-xs font-extrabold text-amber-200 px-3.5 py-1 bg-red-900/50 border border-red-500/40">
              ${createMiniPhuongSvg()}
              <span>${v.order}</span>
            </span>
            <span class="font-mono-code text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-1">
              ${v.date}
            </span>
          </div>

          <div class="text-[11px] font-mono-code font-semibold text-red-400 uppercase tracking-wider">
            ${v.categoryLabel}
          </div>

          <h4 class="text-lg sm:text-xl font-extrabold group-hover:text-[#ee1c25] transition-colors">
            ${v.title}
          </h4>

          <p class="text-xs font-medium text-amber-300/95 flex items-start gap-1.5">
            <span class="shrink-0">📍</span>
            <span>${v.place}</span>
          </p>

          <p class="text-sm text-stone-300 leading-relaxed">
            ${v.summary}
          </p>
        </div>

        <div class="pt-3.5 border-t border-white/10">
          <div class="text-[10px] font-mono-code font-bold uppercase tracking-wider text-amber-400 mb-1">
            🌺 Lời Bác dạy &amp; Dấu ấn đất Cảng:
          </div>
          <p class="font-quote-italic italic text-xs sm:text-sm text-amber-200/95 leading-relaxed">
            ${v.teaching}
          </p>
        </div>
      </article>
    `
      )
      .join("");
  }

  window.filterHaiPhongVisits = function (category) {
    currentHaiPhongFilter = category;
    renderHaiPhongVisits(category);

    const tabButtons = document.querySelectorAll("[data-hp-filter]");
    tabButtons.forEach((btn) => {
      const isMatch = btn.getAttribute("data-hp-filter") === category;
      if (isMatch) {
        btn.className = "btn-crimson-pill !py-2.5 !px-4 !text-xs";
      } else {
        btn.className =
          "btn-soft-pill px-4 py-2.5 border border-white/15 bg-white/5 text-xs font-semibold text-stone-200 hover:border-amber-400/50";
      }
    });
  };

  function renderMaritimeHighlights() {
    const gridEl = document.getElementById("maritime-timeline-grid");
    if (!gridEl || !DATA.maritimeHighlights) return;

    gridEl.innerHTML = DATA.maritimeHighlights
      .map(
        (item) => `
      <div class="ximi-card p-6 sm:p-7 flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <span class="font-mono-code text-xs font-extrabold text-[#ee1c25] px-3 py-1 bg-[#ee1c25]/10 border border-[#ee1c25]/25">
              ${item.year}
            </span>
            <span class="text-xs text-amber-400 font-medium truncate">${item.location}</span>
          </div>
          <h3 class="text-lg md:text-xl font-bold">
            ${item.title}
          </h3>
          <p class="text-sm text-stone-300 leading-relaxed">
            ${item.description}
          </p>
        </div>
        <div class="pt-3 border-t border-white/10">
          <p class="font-quote-italic italic text-xs md:text-sm text-amber-300 font-medium">
            ${item.quote}
          </p>
        </div>
      </div>
    `
      )
      .join("");
  }

  // ==================== 05. HỆ THỐNG 6 CHƯƠNG GIÁO TRÌNH ====================
  function renderChapters(searchTerm = "") {
    const listEl = document.getElementById("chapters-list");
    if (!listEl || !DATA.chapters) return;

    const query = searchTerm.trim().toLowerCase();
    const filtered = DATA.chapters.filter((ch) => {
      if (!query) return true;
      const inTitle = ch.title.toLowerCase().includes(query);
      const inSummary = ch.summary.toLowerCase().includes(query);
      const inSections = ch.sections.some(
        (s) =>
          s.heading.toLowerCase().includes(query) ||
          s.points.some((pt) => pt.toLowerCase().includes(query))
      );
      const inVMU = ch.vmuConnection.toLowerCase().includes(query);
      return inTitle || inSummary || inSections || inVMU;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="ximi-card p-8 text-center text-stone-400">
          Không tìm thấy nội dung chương phù hợp với từ khóa "<span class="text-[#ee1c25] font-semibold">${escapeHtml(
            searchTerm
          )}</span>". Hãy thử từ khóa khác như "độc lập", "đạo đức", "đảng", "đoàn kết", "hàng hải", "hải phòng"...
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered
      .map((ch) => {
        const originalIdx = DATA.chapters.findIndex((c) => c.id === ch.id);
        return `
        <article 
          onclick="window.openChapterModal(${originalIdx})"
          class="ximi-card p-5 md:p-6 cursor-pointer group flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
        >
          <div class="flex items-start gap-4 md:gap-6 flex-1">
            <div class="w-14 h-14 bg-[#1c100c] border border-amber-500/30 flex flex-col items-center justify-center shrink-0 group-hover:bg-[#a30b10] group-hover:border-[#ee1c25] transition-colors">
              <span class="font-mono-code text-[9px] text-amber-400 group-hover:text-amber-200 font-bold">MỤC</span>
              <span class="font-mono-code text-xl font-extrabold text-white">${ch.number}</span>
            </div>
            <div class="space-y-2 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono-code text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 bg-[#ee1c25]/15 text-[#ff4d54] border border-[#ee1c25]/30">
                  ${ch.code}
                </span>
                <span class="text-xs font-medium px-3 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  ${ch.tag}
                </span>
                <span class="text-xs text-stone-400 font-mono-code hidden sm:inline">• ${ch.duration}</span>
              </div>
              <h3 class="text-lg md:text-xl font-extrabold group-hover:text-[#ee1c25] transition-colors">
                ${ch.title}
              </h3>
              <p class="text-sm text-stone-300 line-clamp-2 leading-relaxed">
                ${ch.summary}
              </p>
              <div class="pt-1 flex flex-wrap items-center gap-2 text-xs text-sky-300">
                <span class="inline-flex items-center gap-1 bg-sky-950/60 border border-sky-500/30 px-3 py-1 font-medium">
                  ⚓ Liên hệ thực tiễn sinh viên Trường Đại học Hàng hải Việt Nam
                </span>
                <span class="text-stone-400">${ch.sections.length} nội dung trọng tâm</span>
              </div>
            </div>
          </div>

          <div class="self-end md:self-center shrink-0">
            <span class="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 group-hover:bg-[#a30b10] text-amber-300 group-hover:text-white border border-white/10 text-xs font-bold tracking-wider uppercase transition-all">
              XEM CHI TIẾT →
            </span>
          </div>
        </article>
      `;
      })
      .join("");
  }

  window.openChapterModal = function (index) {
    currentChapterIndex = index;
    const ch = DATA.chapters[index];
    if (!ch) return;

    const modal = document.getElementById("chapter-modal");
    const content = document.getElementById("chapter-modal-body");
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="space-y-6 text-slate-900">
        <div class="border-b border-stone-200 pb-5 pr-10">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span class="font-mono-code text-xs font-bold uppercase px-3.5 py-1 bg-red-100 text-red-800 border border-red-200">
              ${ch.code} (${ch.number})
            </span>
            <span class="text-xs font-semibold px-3.5 py-1 bg-amber-100 text-amber-900 border border-amber-200">
              ${ch.tag}
            </span>
            <span class="text-xs text-slate-500 font-mono-code">${ch.duration}</span>
          </div>
          <h2 class="font-serif-editorial text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
            ${ch.title}
          </h2>
          <p class="mt-2 text-sm md:text-base text-slate-600 leading-relaxed">
            ${ch.summary}
          </p>
        </div>

        <blockquote class="bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border-l-4 border-red-700 p-4 md:p-5">
          <p class="font-quote-italic italic text-red-950 font-medium text-base md:text-lg leading-relaxed">
            ${ch.quote}
          </p>
        </blockquote>

        <div class="space-y-5">
          ${ch.sections
            .map(
              (sec) => `
            <div class="bg-stone-50 border border-stone-200 p-5 space-y-3">
              <h4 class="text-base md:text-lg font-bold text-red-900">
                ${sec.heading}
              </h4>
              <ul class="space-y-2.5 text-sm md:text-base text-slate-700 leading-relaxed">
                ${sec.points
                  .map(
                    (pt) => `
                  <li class="flex items-start gap-2.5">
                    <span class="text-red-700 mt-1 shrink-0">●</span>
                    <span>${pt}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="bg-sky-50 border border-sky-300 p-5 md:p-6">
          <div class="flex items-center gap-2 text-sky-900 font-bold text-sm uppercase tracking-wider mb-2">
            <span>⚓</span>
            <span>Vận dụng &amp; Liên hệ thực tiễn Sinh viên Trường Đại học Hàng hải Việt Nam (Hải Phòng)</span>
          </div>
          <p class="text-sm md:text-base text-sky-950 leading-relaxed">
            ${ch.vmuConnection}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-between pt-4 border-t border-stone-200 gap-3">
          <button
            onclick="window.openChapterModal(${
              (index - 1 + DATA.chapters.length) % DATA.chapters.length
            })"
            class="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-xs md:text-sm text-slate-800 font-semibold transition"
          >
            ← Chương trước
          </button>
          <button
            onclick="window.closeChapterModal()"
            class="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-semibold transition"
          >
            Đóng cửa sổ
          </button>
          <button
            onclick="window.openChapterModal(${
              (index + 1) % DATA.chapters.length
            })"
            class="px-5 py-2.5 bg-[#a30b10] hover:bg-[#c81017] text-white text-xs md:text-sm font-semibold transition"
          >
            Chương tiếp theo →
          </button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  };

  window.closeChapterModal = function () {
    const modal = document.getElementById("chapter-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  };

  // ==================== 06. TRẮC NGHIỆM ÔN TẬP KẾT THÚC HỌC PHẦN ====================
  function renderQuiz() {
    const container = document.getElementById("quiz-container");
    if (!container || !DATA.quizQuestions) return;

    const q = DATA.quizQuestions[currentQuizIndex];
    const total = DATA.quizQuestions.length;
    const selectedIdx = quizAnswered[q.id];

    container.innerHTML = `
      <div class="space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div class="flex items-center gap-2">
            <span class="font-mono-code text-xs font-bold px-3.5 py-1 bg-[#ee1c25]/20 text-[#ff4d54] border border-[#ee1c25]/40">
              CÂU ${currentQuizIndex + 1} / ${total}
            </span>
            <span class="text-xs font-semibold px-3.5 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30">
              ${q.chapter}
            </span>
          </div>
          <div class="font-mono-code text-xs font-semibold text-emerald-400">
            Điểm hiện tại: <strong class="text-white">${quizScore}</strong> / ${
              Object.keys(quizAnswered).length
            } câu đã trả lời
          </div>
        </div>

        <h3 class="text-base md:text-lg font-bold leading-relaxed">
          ${q.question}
        </h3>

        <div class="grid grid-cols-1 gap-3">
          ${q.options
            .map((opt, idx) => {
              let btnStyle =
                "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-amber-500/40 text-stone-200";
              let badgeStyle = "bg-white/10 text-amber-300";
              let badge = String.fromCharCode(65 + idx);

              if (selectedIdx !== undefined) {
                if (idx === q.answer) {
                  btnStyle =
                    "bg-emerald-950/70 border-emerald-400 text-emerald-100 font-semibold";
                  badgeStyle = "bg-emerald-500 text-slate-950";
                  badge = "✓";
                } else if (idx === selectedIdx && idx !== q.answer) {
                  btnStyle = "bg-red-950/70 border-red-400 text-red-100";
                  badgeStyle = "bg-red-500 text-white";
                  badge = "✕";
                } else {
                  btnStyle = "bg-white/[0.01] border-white/5 text-stone-500";
                  badgeStyle = "bg-white/5 text-stone-500";
                }
              }

              return `
              <button
                type="button"
                onclick="window.answerQuizQuestion(${idx})"
                ${selectedIdx !== undefined ? "disabled" : ""}
                class="w-full text-left p-4 border transition-all flex items-start gap-3 ${btnStyle}"
              >
                <span class="w-7 h-7 font-mono-code text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${badgeStyle}">
                  ${badge}
                </span>
                <span class="text-sm md:text-base leading-relaxed">${opt}</span>
              </button>
            `;
            })
            .join("")}
        </div>

        ${
          selectedIdx !== undefined
            ? `
          <div class="p-4 bg-amber-950/50 border border-amber-500/40 text-xs md:text-sm text-amber-100 leading-relaxed">
            <strong class="text-amber-400">Giải thích chi tiết:</strong> ${q.explanation}
          </div>
        `
            : ""
        }

        <div class="flex flex-wrap items-center justify-between pt-3 border-t border-white/10 gap-3">
          <button
            type="button"
            onclick="window.prevQuizQuestion()"
            class="btn-soft-pill px-5 py-2.5 border border-white/15 bg-white/5 text-xs md:text-sm font-semibold text-stone-200"
          >
            ← Câu trước
          </button>
          <button
            type="button"
            onclick="window.resetQuiz()"
            class="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-[#ee1c25] hover:bg-white/5 transition"
          >
            ↺ Làm lại từ đầu
          </button>
          <button
            type="button"
            onclick="window.nextQuizQuestion()"
            class="btn-crimson-pill !py-2.5 !px-6 !text-xs"
          >
            Câu tiếp theo →
          </button>
        </div>
      </div>
    `;
  }

  window.answerQuizQuestion = function (selectedIdx) {
    const q = DATA.quizQuestions[currentQuizIndex];
    if (quizAnswered[q.id] !== undefined) return;
    quizAnswered[q.id] = selectedIdx;
    if (selectedIdx === q.answer) {
      quizScore += 1;
    }
    renderQuiz();
  };

  window.nextQuizQuestion = function () {
    currentQuizIndex = (currentQuizIndex + 1) % DATA.quizQuestions.length;
    renderQuiz();
  };

  window.prevQuizQuestion = function () {
    currentQuizIndex =
      (currentQuizIndex - 1 + DATA.quizQuestions.length) %
      DATA.quizQuestions.length;
    renderQuiz();
  };

  window.resetQuiz = function () {
    currentQuizIndex = 0;
    quizScore = 0;
    quizAnswered = {};
    renderQuiz();
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==================== HIỆU ỨNG CUỘN MƯỢT MÀ ====================
  function initSmoothScrollAndReveal() {
    document.addEventListener("click", (event) => {
      if (!isPlainClick(event)) return;
      const link = event.target.closest('.site-header a[href^="#"], .site-hero a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute("href");
      const target = hash === "#" ? document.body : document.getElementById(hash.slice(1));
      if (!target) return;

      event.preventDefault();
      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start", behavior: reducedMotion.matches ? "instant" : "smooth" });
    });

    const progressBar = document.getElementById("scroll-progress-bar");
    const root = document.documentElement;
    const header = document.querySelector(".site-header");
    const syncHeaderHeight = () => {
      if (header) root.style.setProperty("--header-height", `${header.offsetHeight}px`);
    };
    let frame = 0;
    const updateProgress = () => {
      const distance = root.scrollHeight - root.clientHeight;
      const progress = distance > 0 ? Math.max(0, Math.min(1, window.scrollY / distance)) : 0;
      if (progressBar) {
        progressBar.style.transform = `scaleX(${progress})`;
      }
      frame = 0;
    };
    const scheduleProgress = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };

    window.addEventListener("scroll", scheduleProgress, { passive: true });
    window.addEventListener("resize", scheduleProgress);
    window.addEventListener("resize", syncHeaderHeight);
    if ("ResizeObserver" in window) {
      new ResizeObserver(scheduleProgress).observe(document.body);
      if (header) new ResizeObserver(syncHeaderHeight).observe(header);
    }
    syncHeaderHeight();
    updateProgress();

    if (!("IntersectionObserver" in window) || reducedMotion.matches) return;
    const observer = new IntersectionObserver((entries) => {
      let cardIndex = 0;
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        if (target.matches(".ximi-card, .phuong-stat-box")) {
          target.style.setProperty("--reveal-delay", `${Math.min(cardIndex++, 3) * 65}ms`);
        }
        target.classList.add("is-visible");
        observer.unobserve(target);
      });
    });
    const targets = ".reveal-on-scroll > :first-child, .site-main :is(.ximi-card, .phuong-stat-box)";
    document.querySelectorAll(targets).forEach((element) => {
      if (element.getBoundingClientRect().top <= window.innerHeight) return;
      element.classList.add("will-reveal");
      observer.observe(element);
    });
  }

  function isPlainClick(event) {
    return !event.defaultPrevented && event.button === 0 &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  // Khởi chạy toàn bộ trang khi sẵn sàng
  document.addEventListener("DOMContentLoaded", () => {
    loadSavedBookPages();
    renderDanhXung();
    renderTimeline();
    renderClassicWorks();
    renderHaiPhongStats();
    renderHaiPhongVisits(currentHaiPhongFilter);
    renderMaritimeHighlights();
    renderChapters();
    renderQuiz();
    initSmoothScrollAndReveal();

    const searchInput = document.getElementById("chapter-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        renderChapters(e.target.value);
      });
    }

    document.addEventListener("keydown", (e) => {
      const modal = document.getElementById("chapter-modal");
      const isModalOpen = modal && !modal.classList.contains("hidden");
      if (e.key === "Escape" && isModalOpen) {
        window.closeChapterModal();
      }
    });
  });
})();
