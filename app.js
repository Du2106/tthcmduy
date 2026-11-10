// Xử lý tương tác Không gian Học liệu số Tư tưởng Hồ Chí Minh
// Tối ưu hóa Animation 60-120fps mượt mà cho chuyển mục, Biên niên sử, Danh xưng & Sách 3D

(function () {
  const DATA = window.TTHCM_DATA;
  const STORAGE_KEY = "tthcm_hai_phong_book_v2";
  const PLEDGE_STORAGE_KEY = "tthcm_pledge_count_v1";

  let currentChapterIndex = 0;
  let currentQuizIndex = 0;
  let quizScore = 0;
  let quizAnswered = {};
  let currentHaiPhongFilter = "tat-ca";

  const BASE_PLEDGE_COUNT = 66438;
  const TARGET_PLEDGE_COUNT = 100000;

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

  function formatDotNumber(num) {
    return Number(num).toLocaleString("vi-VN");
  }

  function initCampaignCounter() {
    const savedCount = parseInt(localStorage.getItem(PLEDGE_STORAGE_KEY) || String(BASE_PLEDGE_COUNT), 10);
    const count = isNaN(savedCount) ? BASE_PLEDGE_COUNT : savedCount;
    const counterEl = document.getElementById("campaign-counter-value");
    const fillEl = document.getElementById("campaign-progress-fill");
    const fractionEl = document.getElementById("campaign-progress-text");

    if (counterEl) counterEl.textContent = formatDotNumber(count);
    const pct = Math.min(100, (count / TARGET_PLEDGE_COUNT) * 100).toFixed(2);
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (fractionEl) {
      fractionEl.textContent = `${formatDotNumber(count)} / ${formatDotNumber(TARGET_PLEDGE_COUNT)}`;
    }
  }

  window.toggleTheme = function () {
    const isLight = document.body.classList.toggle("theme-light");
    const labelEl = document.getElementById("theme-toggle-label");
    if (labelEl) {
      labelEl.textContent = isLight ? "☾ Sắc nền tối" : "☀ Sắc nền sáng";
    }
  };

  window.copyCampaignLink = async function () {
    const btn = document.getElementById("copy-link-btn");
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      const original = btn.textContent;
      btn.textContent = "ĐÃ SAO CHÉP LIÊN KẾT ✓";
      setTimeout(() => {
        btn.textContent = original;
      }, 2200);
    } catch {
      btn.textContent = "SAO CHÉP THÀNH CÔNG ✓";
    }
  };

  function createFallbackSvgDataUri(page) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 540" width="800" height="540">
      <rect width="800" height="540" fill="#0d0d0d"/>
      <rect x="24" y="24" width="752" height="492" fill="none" stroke="#dc2626" stroke-width="2" stroke-opacity="0.6"/>
      <text x="400" y="250" text-anchor="middle" fill="#dc2626" font-family="Barlow Condensed, sans-serif" font-size="54" font-weight="800">${escapeXml(
        page.dateBadge
      )}</text>
      <text x="400" y="310" text-anchor="middle" fill="#ffffff" font-family="Be Vietnam Pro, sans-serif" font-size="22" font-weight="700">${escapeXml(
        page.title.slice(0, 48)
      )}${page.title.length > 48 ? "..." : ""}</text>
      <text x="400" y="360" text-anchor="middle" fill="#a3a3a3" font-family="Be Vietnam Pro, sans-serif" font-size="15">${escapeXml(
        page.location
      )}</text>
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

// ==================== 01. HIỂN THỊ DANH XƯNG ====================
  function renderDanhXung() {
    const gridEl = document.getElementById("danh-xung-grid");
    if (!gridEl || !DATA.danhXung) return;

    gridEl.innerHTML = DATA.danhXung
      .map(
        (item, idx) => `
      <article data-alias-card="${idx}" class="ximi-card p-6 sm:p-8 flex flex-col justify-between space-y-6 group">
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <span class="font-mono-code text-xs font-extrabold text-[#dc2626] tracking-widest uppercase">
              DANH XƯNG ${item.index}
            </span>
            <span class="font-mono-code text-[11px] font-semibold text-neutral-300 border border-white/20 px-3 py-1">
              ${item.period}
            </span>
          </div>

          <h3 class="font-display text-4xl font-extrabold uppercase tracking-tight text-white group-hover:text-[#dc2626] transition-colors duration-300">
            ${item.name}
          </h3>

          <p class="text-xs font-mono-code uppercase tracking-wider text-neutral-400">
            ${item.place}
          </p>

          <p class="text-sm text-neutral-200 leading-relaxed">
            ${item.meaning}
          </p>
        </div>

        <div class="pt-4 border-t border-[#dc2626]/30 text-xs text-neutral-300">
          <strong class="text-white uppercase tracking-widest block mb-1.5 font-mono-code text-[11px]">
            DẤU ẤN LỊCH SỬ —
          </strong>
          <span class="leading-relaxed block">${item.milestone}</span>
        </div>
      </article>
    `
      )
      .join("");
  }
  // ==================== 02. BIÊN NIÊN SỬ (CHUYỂN CỘT MỐC MƯỢT 60FPS, KHÔNG GIẬT DOM) ====================
  function renderTimeline() {
    const list = document.getElementById("timeline-milestones");
    const pages = DATA.bookPages;
    if (!list || !pages.length) return;

    const compact = window.matchMedia("(max-width: 767px)");
    const yearOf = (page) => page.timelineYear || page.dateBadge.match(/\b\d{4}\b/)?.[0] || page.period;

    list.innerHTML = pages
      .map(
        (page, index) => `
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
              <span class="timeline-period text-[#dc2626]">GIAI ĐOẠN ${escapeHtml(page.period)}</span>
              <div class="timeline-meta mt-2">
                <span class="timeline-detail-year">${escapeHtml(yearOf(page))}</span>
                <span class="timeline-location">${escapeHtml(page.location)}</span>
              </div>
            </header>
            <h3 id="timeline-title-${index}">${escapeHtml(page.timelineTitle || page.title)}</h3>
            ${page.story.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
            <blockquote>${escapeHtml(page.quote)}</blockquote>
            <p class="pt-4 border-t border-white/10"><strong class="text-white uppercase text-xs tracking-wider">Ý NGHĨA LỊCH SỬ —</strong><br> ${escapeHtml(page.significance)}</p>
            <figure class="timeline-photo">
              <img alt="" decoding="async" loading="lazy">
              <figcaption>${escapeHtml(page.imageCaption)}</figcaption>
            </figure>
          </div>
        </article>
      </li>
    `
      )
      .join("");

    const buttons = Array.from(list.querySelectorAll(".timeline-milestone"));
    const details = Array.from(list.querySelectorAll(".timeline-detail"));

    details.forEach((detail, index) => {
      const page = pages[index];
      const image = detail.querySelector("img");
      image.addEventListener("error", () => {
        image.src = createFallbackSvgDataUri(page);
      }, { once: true });
      image.src = page.imageUrl || createFallbackSvgDataUri(page);
    });

    let activeIndex = 0;
    let currentAnimations = [];

    function cancelTimelineAnimations() {
      currentAnimations.forEach((anim) => anim.cancel());
      currentAnimations = [];
    }

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
      const direction = index > activeIndex ? 1 : -1;

      cancelTimelineAnimations();

      buttons[activeIndex].setAttribute("aria-pressed", "false");
      if (!compact.matches) {
        buttons[activeIndex].after(details[activeIndex]);
      }

      activeIndex = index;
      buttons[index].setAttribute("aria-pressed", "true");
      positionDetail();

      const activeDetail = details[index];
      const content = activeDetail.querySelector(".timeline-detail-content");

      if (typeof content?.animate === "function") {
        // Hiệu ứng lướt mượt toàn khối nội dung chi tiết
        const mainAnim = content.animate(
          [
            { opacity: 0, transform: `translate3d(0, ${direction * 18}px, 0) scale(0.992)` },
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
          ],
          {
            duration: 420,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "both"
          }
        );
        currentAnimations.push(mainAnim);

        // Hiệu ứng Stagger nhẹ cho từng phần tử con bên trong (Tiêu đề, Đoạn văn, Trích dẫn, Ảnh)
        const children = Array.from(content.children);
        children.forEach((child, idx) => {
          const childAnim = child.animate(
            [
              { opacity: 0, transform: `translate3d(0, ${direction * 12}px, 0)` },
              { opacity: 1, transform: "translate3d(0, 0, 0)" }
            ],
            {
              duration: 380,
              delay: Math.min(idx * 35, 160),
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "both"
            }
          );
          currentAnimations.push(childAnim);
        });
      }
    }

    buttons[0].setAttribute("aria-pressed", "true");
    positionDetail();
    compact.addEventListener("change", positionDetail);

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

  // ==================== 03. DI SẢN VĂN KIỆN KINH ĐIỂN (MỞ SÁCH & LẬT TRANG 3D) ====================
  function renderClassicWorks() {
    const container = document.getElementById("classic-works-grid");
    if (!container || !DATA.classicWorks) return;

    container.innerHTML = DATA.classicWorks
      .map(
        (w, i) => `
      <a class="ximi-card work-card p-6 sm:p-8 flex flex-col justify-between gap-6 group" data-work-index="${i}"
        href="${escapeHtml(w.fullTextUrl)}" target="_blank" rel="noopener noreferrer">
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <span class="font-mono-code text-xs font-extrabold text-white px-3 py-1 bg-[#dc2626]">
              TÁC PHẨM 0${i + 1} • ${w.year}
            </span>
            <span class="text-xs text-neutral-400 font-mono-code uppercase">${w.original}</span>
          </div>
          <h3 class="font-display text-3xl font-extrabold uppercase text-white group-hover:text-[#dc2626] transition-colors">${w.title}</h3>
          <p class="text-sm text-neutral-300 leading-relaxed">${w.significance}</p>
        </div>
        <span class="work-card-link">📖 MỞ SÁCH ĐỌC TRÍCH ĐOẠN &amp; TƯ LIỆU <span aria-hidden="true">→</span></span>
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
    const book = document.getElementById("work-reader-book");
    const left = document.getElementById("work-reader-left");
    const right = document.getElementById("work-reader-right");
    const source = document.getElementById("work-reader-source");
    const previous = document.getElementById("work-reader-prev");
    const next = document.getElementById("work-reader-next");
    const pageLabel = document.getElementById("work-reader-page");
    const singlePage = window.matchMedia("(max-width: 640px)");

    let work;
    let pages = [];
    let pageIndex = 0;
    let turningPage;
    let drag;

    function pageMarkup(index) {
      return `
        <section>
          <div class="work-reader-folio">
            ${index === 0
              ? `<span class="work-reader-year">${escapeHtml(work.year)} · BẢN TƯ LIỆU</span>`
              : `<span>${escapeHtml(work.title)}</span>`}
            <span>TRANG ${index + 1} / ${pages.length}</span>
          </div>
          ${pages[index].map(([heading, ...paragraphs], noteIndex) => `
            <div class="work-reader-note">
              ${noteIndex === 0 && index === 0 ? `<h3>${escapeHtml(heading)}</h3>` : `<h4>${escapeHtml(heading)}</h4>`}
              ${index === 0 && noteIndex === 0 ? `
                <figure class="work-reader-figure">
                  <div class="work-reader-photo">
                    <span class="work-reader-plate" aria-hidden="true">${escapeHtml(work.title)}</span>
                    <img alt="" decoding="async" hidden>
                  </div>
                  <figcaption>${escapeHtml(work.imageCaption)}</figcaption>
                </figure>
                <div class="work-reader-excerpt-box">
                  “${escapeHtml(paragraphs[0])}”
                </div>
              ` : paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
            </div>
          `).join("")}
        </section>
      `;
    }

    function setPage(side, index) {
      if (side.dataset.pageIndex === String(index)) return;
      side.dataset.pageIndex = index;
      side.innerHTML = index < pages.length ? pageMarkup(index) : "";
      side.scrollTop = 0;
      const photo = side.querySelector("img");
      if (photo && work?.imageUrl) {
        photo.addEventListener("load", () => { photo.hidden = false; }, { once: true });
        photo.src = work.imageUrl;
      }
    }

    function updatePageControls() {
      const atStart = pageIndex === 0;
      const atEnd = pageIndex + (singlePage.matches ? 1 : 2) >= pages.length;
      previous.setAttribute("aria-disabled", String(Boolean(turningPage) || atStart));
      next.setAttribute("aria-disabled", String(Boolean(turningPage) || atEnd));
      const prevCorner = book.querySelector(".work-reader-corner-prev");
      const nextCorner = book.querySelector(".work-reader-corner-next");
      if (prevCorner) prevCorner.hidden = atStart;
      if (nextCorner) nextCorner.hidden = atEnd;
    }

    function showSpread(index) {
      pageIndex = index;
      setPage(left, index);
      if (!singlePage.matches) setPage(right, index + 1);
      const range = !singlePage.matches && index + 1 < pages.length
        ? `${index + 1}–${index + 2}`
        : index + 1;
      pageLabel.textContent = `Trang ${range} / ${pages.length}`;
      updatePageControls();
    }

    function clearTurn() {
      drag = undefined;
      if (turningPage) {
        turningPage.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
        turningPage.remove();
      }
      turningPage = undefined;
    }

    function addLeafFace(leaf, className, index, visiblePage) {
      const face = document.createElement("div");
      face.className = `work-reader-content ${className}`;
      leaf.append(face);
      if (visiblePage && visiblePage.firstElementChild) {
        face.append(visiblePage.firstElementChild.cloneNode(true));
        face.scrollTop = visiblePage.scrollTop;
      } else {
        setPage(face, index);
      }
    }

    function animatePaperCurl(leaf, isSingle, forward, duration, easing) {
      const stripCount = 12;
      const samples = 32;
      const faces = Array.from(leaf.children, (face) => ({ face, scrollTop: face.scrollTop }));
      const stripWidth = leaf.getBoundingClientRect().width / stripCount;
      const arc = isSingle ? Math.PI / 2 : Math.PI;
      const maxBend = isSingle ? 0.48 : 0.96;
      const tracks = Array.from({ length: stripCount }, () => []);

      for (let sample = 0; sample <= samples; sample++) {
        const time = sample / samples;
        const progress = forward ? time : 1 - time;
        const bend = Math.sin(Math.PI * progress) * maxBend;
        let x = 0;
        let z = 0;
        tracks.forEach((track, index) => {
          const angle = -arc * progress - bend * (index + 0.5) / stripCount;
          track.push({
            transform: `translate3d(${x}px, 0, ${z}px) rotateY(${angle}rad) translateX(${-index * stripWidth}px)`
          });
          x += Math.cos(angle) * stripWidth;
          z -= Math.sin(angle) * stripWidth;
        });
      }

      const strips = tracks.map((_, index) => {
        const strip = document.createElement("div");
        strip.className = "work-reader-paper-strip";
        faces.forEach(({ face }, side) => {
          const clone = face.cloneNode(true);
          const photo = clone.querySelector("img[hidden]");
          if (photo?.complete && photo.naturalWidth) photo.hidden = false;
          else photo?.addEventListener("load", () => { photo.hidden = false; }, { once: true });
          const band = side === 0 ? index : stripCount - index - 1;
          const leftInset = Math.max(0, band / stripCount * 100 - 0.04);
          const rightInset = Math.max(0, (stripCount - band - 1) / stripCount * 100 - 0.04);
          clone.style.clipPath = `inset(0 ${rightInset}% 0 ${leftInset}%)`;
          strip.append(clone);
        });
        return strip;
      });
      leaf.replaceChildren(...strips);

      return strips.map((strip, index) => {
        faces.forEach(({ scrollTop }, side) => {
          if (strip.children[side]) strip.children[side].scrollTop = scrollTop;
        });
        return strip.animate(tracks[index], {
          duration,
          easing,
          fill: "both"
        });
      });
    }

    function turnPage(direction, interactive = false) {
      const isSingle = singlePage.matches;
      const destination = pageIndex + direction * (isSingle ? 1 : 2);
      if (!reader.open || turningPage || destination < 0 || destination >= pages.length) return;
      if (typeof book.animate !== "function") {
        if (!interactive) showSpread(destination);
        return;
      }

      const turn = document.createElement("div");
      turn.className = "work-reader-turn";
      turn.setAttribute("aria-hidden", "true");
      const shadow = document.createElement("div");
      shadow.className = "work-reader-turn-shadow";
      const leaf = document.createElement("div");
      leaf.className = "work-reader-leaf";
      turn.append(shadow, leaf);
      book.append(turn);
      turningPage = turn;

      const forward = direction > 0;
      if (isSingle) {
        addLeafFace(leaf, "", forward ? pageIndex : destination, forward ? left : undefined);
        if (forward) setPage(left, destination);
      } else if (forward) {
        addLeafFace(leaf, "work-reader-right", pageIndex + 1, right);
        addLeafFace(leaf, "work-reader-leaf-back", destination);
        setPage(right, destination + 1);
      } else {
        addLeafFace(leaf, "work-reader-right", destination + 1);
        addLeafFace(leaf, "work-reader-leaf-back", pageIndex, left);
        setPage(left, destination);
      }
      updatePageControls();

      const duration = isSingle ? 520 : 740;
      const animations = animatePaperCurl(
        leaf,
        isSingle,
        forward,
        duration,
        interactive ? "linear" : "cubic-bezier(0.42, 0, 0.28, 1)"
      );
      animations.push(
        shadow.animate(
          [
            { opacity: 0, transform: "scaleX(0.4)" },
            { opacity: 1, transform: "scaleX(1)" },
            { opacity: 0, transform: "scaleX(0.4)" }
          ],
          { duration, easing: "ease-in-out" }
        )
      );

      if (interactive) animations.forEach((animation) => animation.pause());
      animations[0].addEventListener("finish", () => {
        if (turningPage !== turn) return;
        const completed = animations[0].playbackRate > 0;
        clearTurn();
        if (reader.open) showSpread(completed ? destination : pageIndex);
      });
      return { animations, duration, width: leaf.offsetWidth };
    }

    book.addEventListener("pointerdown", (event) => {
      const corner = event.target.closest(".work-reader-corner");
      if (!corner || turningPage || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      const direction = Number(corner.dataset.direction);
      const turn = turnPage(direction, true);
      if (!turn) {
        turnPage(direction);
        return;
      }
      drag = { ...turn, id: event.pointerId, direction, startX: event.clientX, progress: 0, moved: false };
      book.setPointerCapture(event.pointerId);
    });

    window.addEventListener("pointermove", (event) => {
      if (drag?.id !== event.pointerId) return;
      const distance = drag.startX - event.clientX;
      drag.moved ||= Math.abs(distance) > 5;
      drag.progress = Math.max(0, Math.min(0.99, (distance * drag.direction) / drag.width));
      drag.animations.forEach((animation) => {
        animation.currentTime = drag.duration * drag.progress;
      });
    });

    function releaseCorner(event) {
      if (drag?.id !== event.pointerId) return;
      const turn = drag;
      drag = undefined;
      const complete = event.type === "pointerup" && (!turn.moved || turn.progress >= 0.22);
      if (!complete && turn.progress === 0) {
        restoreSpread();
        return;
      }
      turn.animations.forEach((animation) => {
        animation.playbackRate = complete ? 1.4 : -1.4;
        animation.play();
      });
    }

    window.addEventListener("pointerup", releaseCorner);
    window.addEventListener("pointercancel", releaseCorner);
    window.addEventListener("blur", () => {
      if (drag) restoreSpread();
    });
    book.addEventListener("dragstart", (event) => {
      if (drag) event.preventDefault();
    });

    function restoreSpread() {
      if (!reader.open) return;
      clearTurn();
      showSpread(singlePage.matches ? pageIndex : pageIndex - (pageIndex % 2));
    }

    singlePage.addEventListener("change", restoreSpread);
    window.addEventListener("resize", () => {
      if (turningPage) restoreSpread();
    });
    previous.addEventListener("click", () => turnPage(-1));
    next.addEventListener("click", () => turnPage(1));

    reader.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        turnPage(event.key === "ArrowLeft" ? -1 : 1);
      }
    });

    reader.addEventListener("click", (event) => {
      if (event.target === reader) {
        reader.close();
      }
    });

    reader.addEventListener("close", () => {
      if (!reader.open) clearTurn();
    });

    container.addEventListener("click", (event) => {
      const card = event.target.closest("[data-work-index]");
      if (!card || !isPlainClick(event)) return;

      event.preventDefault();
      clearTurn();
      work = DATA.classicWorks[Number(card.dataset.workIndex)];
      title.textContent = work.title;
      meta.textContent = `${work.year} · ${work.original}`;
      const [introduction, ...notes] = work.readingNotes;
      pages = [[[work.title, work.significance], introduction]];
      for (let index = 0; index < notes.length; index += 2) {
        pages.push(notes.slice(index, index + 2));
      }
      delete left.dataset.pageIndex;
      delete right.dataset.pageIndex;
      source.href = work.fullTextUrl;
      reader.showModal();
      showSpread(0);
    });
  }

  // ==================== 04. BÁC HỒ VỚI HẢI PHÒNG (LỌC TAB MƯỢT MÀ) ====================
  function renderHaiPhongStats() {
    const statsGrid = document.getElementById("hai-phong-stats-grid");
    if (!statsGrid || !DATA.haiPhongSection?.stats) return;

    statsGrid.innerHTML = DATA.haiPhongSection.stats
      .map(
        (s) => `
      <div class="phuong-stat-box space-y-2">
        <div class="font-display text-4xl font-black uppercase text-white">${s.number}</div>
        <div class="w-8 h-1 bg-[#dc2626]"></div>
        <div class="text-xs font-mono-code uppercase tracking-wider font-bold text-neutral-200">${s.label}</div>
        <p class="text-xs text-neutral-400 leading-relaxed">${s.detail}</p>
      </div>
    `
      )
      .join("");
  }

  function renderHaiPhongVisits(filterCategory = "tat-ca", animate = false) {
    const gridEl = document.getElementById("hai-phong-visits-grid");
    if (!gridEl || !DATA.haiPhongSection?.nineVisits) return;

    const visits = DATA.haiPhongSection.nineVisits.filter((v) =>
      filterCategory === "tat-ca" ? true : v.category === filterCategory
    );

    gridEl.innerHTML = visits
      .map(
        (v) => `
      <article class="ximi-card p-6 sm:p-7 flex flex-col justify-between space-y-5 group">
        <div class="space-y-3.5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
            <span class="font-mono-code text-xs font-extrabold text-white px-3 py-1 bg-[#dc2626] uppercase">
              ${v.order}
            </span>
            <span class="font-mono-code text-[11px] font-bold text-neutral-300 border border-white/20 px-3 py-1">
              ${v.date}
            </span>
          </div>

          <div class="text-[11px] font-mono-code font-semibold text-[#dc2626] uppercase tracking-widest">
            ${v.categoryLabel}
          </div>

          <h4 class="font-display text-2xl font-extrabold uppercase text-white group-hover:text-[#dc2626] transition-colors">
            ${v.title}
          </h4>

          <p class="text-xs font-mono-code text-neutral-400">
            📍 ${v.place}
          </p>

          <p class="text-sm text-neutral-300 leading-relaxed">
            ${v.summary}
          </p>
        </div>

        <div class="pt-3.5 border-t border-white/10">
          <div class="text-[10px] font-mono-code font-bold uppercase tracking-widest text-[#dc2626] mb-1">
            LỜI BÁC DẠY &amp; DẤU ẤN ĐẤT CẢNG —
          </div>
          <p class="font-quote-italic italic text-xs sm:text-sm text-neutral-200 leading-relaxed">
            ${v.teaching}
          </p>
        </div>
      </article>
    `
      )
      .join("");

    if (animate) {
      Array.from(gridEl.children).forEach((card, idx) => {
        if (typeof card.animate === "function") {
          card.animate(
            [
              { opacity: 0, transform: "translate3d(0, 14px, 0)" },
              { opacity: 1, transform: "translate3d(0, 0, 0)" }
            ],
            {
              duration: 360,
              delay: Math.min(idx * 45, 220),
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "both"
            }
          );
        }
      });
    }
  }

  window.filterHaiPhongVisits = function (category) {
    if (currentHaiPhongFilter === category) return;
    currentHaiPhongFilter = category;
    renderHaiPhongVisits(category, true);

    const tabButtons = document.querySelectorAll("[data-hp-filter]");
    tabButtons.forEach((btn) => {
      const isMatch = btn.getAttribute("data-hp-filter") === category;
      if (isMatch) {
        btn.className = "btn-crimson-pill !py-2.5 !px-4 !text-xs";
      } else {
        btn.className =
          "btn-soft-pill px-4 py-2.5 border border-white/20 bg-transparent text-xs font-semibold text-neutral-300 hover:border-red-600";
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
            <span class="font-mono-code text-xs font-extrabold text-white px-3 py-1 bg-[#dc2626]">
              ${item.year}
            </span>
            <span class="text-xs text-neutral-400 font-mono-code uppercase truncate">${item.location}</span>
          </div>
          <h3 class="font-display text-2xl font-extrabold uppercase text-white">
            ${item.title}
          </h3>
          <p class="text-sm text-neutral-300 leading-relaxed">
            ${item.description}
          </p>
        </div>
        <div class="pt-3 border-t border-white/10">
          <p class="font-quote-italic italic text-xs md:text-sm text-neutral-200">
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
        <div class="ximi-card p-8 text-center text-neutral-400">
          Không tìm thấy nội dung chương phù hợp với từ khóa "<span class="text-[#dc2626] font-semibold">${escapeHtml(
            searchTerm
          )}</span>".
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
            <div class="w-16 h-16 bg-black border border-white/20 flex flex-col items-center justify-center shrink-0 group-hover:bg-[#dc2626] group-hover:border-[#dc2626] transition-colors">
              <span class="font-mono-code text-[9px] text-neutral-400 group-hover:text-white font-bold">MỤC</span>
              <span class="font-display text-3xl font-black text-white leading-none">${ch.number}</span>
            </div>
            <div class="space-y-2 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono-code text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 bg-[#dc2626] text-white">
                  ${ch.code}
                </span>
                <span class="text-xs font-mono-code px-3 py-0.5 border border-white/20 text-neutral-300">
                  ${ch.tag}
                </span>
                <span class="text-xs text-neutral-500 font-mono-code hidden sm:inline">• ${ch.duration}</span>
              </div>
              <h3 class="font-display text-2xl font-extrabold uppercase text-white group-hover:text-[#dc2626] transition-colors">
                ${ch.title}
              </h3>
              <p class="text-sm text-neutral-300 line-clamp-2 leading-relaxed">
                ${ch.summary}
              </p>
            </div>
          </div>

          <div class="self-end md:self-center shrink-0">
            <span class="inline-flex items-center gap-2 px-5 py-2.5 border border-white/25 group-hover:border-[#dc2626] group-hover:bg-[#dc2626] text-white text-xs font-bold tracking-widest uppercase transition-all">
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
      <div class="space-y-6 text-neutral-200">
        <div class="border-b border-white/15 pb-5 pr-12">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span class="font-mono-code text-xs font-bold uppercase px-3 py-1 bg-[#dc2626] text-white">
              ${ch.code} (${ch.number})
            </span>
            <span class="text-xs font-mono-code px-3 py-1 border border-white/20 text-neutral-300">
              ${ch.tag}
            </span>
            <span class="text-xs text-neutral-400 font-mono-code">${ch.duration}</span>
          </div>
          <h2 class="font-display text-3xl md:text-4xl font-extrabold uppercase text-white leading-tight">
            ${ch.title}
          </h2>
          <p class="mt-2.5 text-sm md:text-base text-neutral-300 leading-relaxed">
            ${ch.summary}
          </p>
        </div>

        <blockquote class="bg-white/[0.03] border-l-4 border-[#dc2626] p-4 md:p-5">
          <p class="font-quote-italic italic text-white font-medium text-base md:text-lg leading-relaxed">
            ${ch.quote}
          </p>
        </blockquote>

        <div class="space-y-4">
          ${ch.sections
            .map(
              (sec) => `
            <div class="bg-white/[0.02] border border-white/15 p-5 space-y-3">
              <h4 class="font-display text-xl font-bold uppercase text-[#dc2626]">
                ${sec.heading}
              </h4>
              <ul class="space-y-2.5 text-sm md:text-base text-neutral-300 leading-relaxed">
                ${sec.points
                  .map(
                    (pt) => `
                  <li class="flex items-start gap-2.5">
                    <span class="text-[#dc2626] mt-1 shrink-0">■</span>
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

        <div class="bg-white/[0.03] border border-white/20 border-l-4 border-l-white p-5 md:p-6">
          <div class="text-white font-mono-code font-bold text-xs uppercase tracking-widest mb-2">
            ⚓ LIÊN HỆ THỰC TIỄN SINH VIÊN TRƯỜNG ĐẠI HỌC HÀNG HẢI VIỆT NAM (HẢI PHÒNG)
          </div>
          <p class="text-sm md:text-base text-neutral-300 leading-relaxed">
            ${ch.vmuConnection}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-between pt-4 border-t border-white/15 gap-3">
          <button
            onclick="window.openChapterModal(${
              (index - 1 + DATA.chapters.length) % DATA.chapters.length
            })"
            class="px-5 py-2.5 border border-white/25 hover:border-white text-xs font-mono-code uppercase tracking-wider text-neutral-200 transition"
          >
            ← Chương trước
          </button>
          <button
            onclick="window.closeChapterModal()"
            class="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono-code uppercase tracking-wider transition"
          >
            Đóng cửa sổ
          </button>
          <button
            onclick="window.openChapterModal(${
              (index + 1) % DATA.chapters.length
            })"
            class="px-5 py-2.5 bg-[#dc2626] hover:bg-red-700 text-white text-xs font-mono-code uppercase tracking-wider font-bold transition"
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

  // ==================== 06. TRẮC NGHIỆM ÔN TẬP ====================
  function renderQuiz() {
    const container = document.getElementById("quiz-container");
    if (!container || !DATA.quizQuestions) return;

    const q = DATA.quizQuestions[currentQuizIndex];
    const total = DATA.quizQuestions.length;
    const selectedIdx = quizAnswered[q.id];
    const answeredCount = Object.keys(quizAnswered).length;
    const progressPercent = Math.round((answeredCount / total) * 100);

    container.innerHTML = `
      <div class="space-y-5">
        <div class="space-y-3 border-b border-white/15 pb-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono-code text-xs font-bold px-3.5 py-1 bg-[#dc2626] text-white whitespace-nowrap">
                CÂU ${currentQuizIndex + 1} / ${total}
              </span>
              <span class="text-xs font-mono-code px-3.5 py-1 border border-white/20 text-neutral-300">
                ${escapeHtml(q.chapter)}
              </span>
            </div>
            <div class="font-mono-code text-xs font-bold text-neutral-300 uppercase">
              ĐIỂM: <strong class="text-[#dc2626] text-base">${quizScore}</strong> / ${answeredCount} (${progressPercent}%)
            </div>
          </div>

          <div class="w-full h-1.5 bg-white/15 overflow-hidden">
            <div class="h-full bg-[#dc2626] transition-all duration-500" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        <h3 class="text-base md:text-lg font-bold text-white leading-relaxed">
          ${escapeHtml(q.question)}
        </h3>

        <div class="grid grid-cols-1 gap-3">
          ${q.options
            .map((opt, idx) => {
              let btnStyle =
                "bg-white/[0.02] hover:bg-white/[0.06] border-white/15 hover:border-white/50 text-neutral-200";
              let badgeStyle = "bg-white/10 text-white";
              let badge = String.fromCharCode(65 + idx);

              if (selectedIdx !== undefined) {
                if (idx === q.answer) {
                  btnStyle =
                    "bg-emerald-950/70 border-emerald-500 text-emerald-100 font-semibold";
                  badgeStyle = "bg-emerald-500 text-black";
                  badge = "✓";
                } else if (idx === selectedIdx && idx !== q.answer) {
                  btnStyle = "bg-red-950/70 border-[#dc2626] text-red-100";
                  badgeStyle = "bg-[#dc2626] text-white";
                  badge = "✕";
                } else {
                  btnStyle = "bg-transparent border-white/5 text-neutral-600";
                  badgeStyle = "bg-white/5 text-neutral-600";
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
                <span class="text-sm md:text-base leading-relaxed">${escapeHtml(opt)}</span>
              </button>
            `;
            })
            .join("")}
        </div>

        ${
          selectedIdx !== undefined
            ? `
          <div class="p-4 bg-white/[0.04] border-l-4 border-[#dc2626] text-xs md:text-sm text-neutral-200 leading-relaxed">
            <strong class="text-white uppercase font-mono-code block mb-1">Giải thích đáp án:</strong>
            <p>${escapeHtml(q.explanation)}</p>
            ${q.remember ? `<p class="mt-2"><strong>Ghi nhớ:</strong> ${escapeHtml(q.remember)}</p>` : ""}
            ${q.note ? `<p class="mt-2"><strong>Ghi chú đối chiếu:</strong> ${escapeHtml(q.note)}</p>` : ""}
            ${q.reference ? `<a class="inline-block mt-2 underline" href="${escapeHtml(q.reference)}" target="_blank" rel="noopener noreferrer">${escapeHtml(q.referenceName || "Xem nguồn đối chiếu")} ↗</a>` : ""}
          </div>
        `
            : ""
        }

        <div class="quiz-actions flex flex-wrap items-center justify-between pt-3 border-t border-white/15 gap-3">
          <button
            type="button"
            onclick="window.prevQuizQuestion()"
            class="btn-editorial-outline-gray !py-2.5 !px-5 !text-xs"
          >
            ← Câu trước
          </button>
          <button
            type="button"
            onclick="window.resetQuiz()"
            class="quiz-reset px-4 py-2 text-xs font-mono-code uppercase tracking-wider text-neutral-400 hover:text-[#dc2626] transition"
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

  function isPlainClick(event) {
    return !event.defaultPrevented && event.button === 0 &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }

  // ==================== HIỆU ỨNG CUỘN TRANG & THANH TRƯỢT MENU KHÔNG BỊ KHỰNG ====================
  function initSmoothScrollAndReveal() {
    const root = document.documentElement;
    let activeScrollFrame = 0;
    let isProgrammaticScroll = false;

    const progressBar = document.getElementById("scroll-progress-bar");
    const header = document.querySelector(".site-header");
    const navigationLinks = Array.from(document.querySelectorAll('.site-nav-links a[href^="#"]'));
    const navigationSections = navigationLinks
      .map((link) => ({
        link,
        section: document.getElementById(link.hash.slice(1))
      }))
      .filter(({ section }) => section);

    const slidingIndicator = document.getElementById("nav-sliding-indicator");
    let activeLink;

    const syncHeaderHeight = () => {
      if (header) root.style.setProperty("--header-height", `${header.offsetHeight}px`);
    };

    const updateSlidingIndicator = (targetLink) => {
      if (!slidingIndicator || !targetLink) return;
      const navContainer = targetLink.closest(".site-nav-links");
      if (!navContainer) return;

      const linkRect = targetLink.getBoundingClientRect();
      const containerRect = navContainer.getBoundingClientRect();
      const leftPos = linkRect.left - containerRect.left;
      const rowOffset = linkRect.bottom - containerRect.bottom;

      slidingIndicator.style.width = `${linkRect.width}px`;
      slidingIndicator.style.transform = `translate3d(${leftPos}px, ${rowOffset}px, 0)`;
      slidingIndicator.classList.add("active");
    };

    const setActiveNavLink = (targetLink) => {
      if (targetLink === activeLink) return;
      if (activeLink) activeLink.removeAttribute("aria-current");
      if (targetLink) {
        targetLink.setAttribute("aria-current", "location");
        updateSlidingIndicator(targetLink);
      } else if (slidingIndicator) {
        slidingIndicator.classList.remove("active");
      }
      activeLink = targetLink;
    };

    function cancelActiveScroll() {
      if (activeScrollFrame) {
        window.cancelAnimationFrame(activeScrollFrame);
        activeScrollFrame = 0;
      }
      isProgrammaticScroll = false;
    }

    // Đường cong easeOutQuint cực mượt, không bị khựng ở đầu và cuối
    function easeOutQuint(t) {
      return 1 - Math.pow(1 - t, 5);
    }

    function animateScrollTo(targetElement, isTop = false, clickedNavLink = null) {
      cancelActiveScroll();

      const headerOffset = (header ? header.offsetHeight : 64) + 20;
      const startY = window.scrollY;
      const rawTargetY = isTop
        ? 0
        : startY + targetElement.getBoundingClientRect().top - headerOffset;

      const maxScrollY = Math.max(0, root.scrollHeight - root.clientHeight);
      const destinationY = Math.max(0, Math.min(rawTargetY, maxScrollY));
      const distance = destinationY - startY;

      // Trượt thẳng thanh gạch chân đỏ tới mục vừa click ngay lập tức (không nhảy qua mục trung gian)
      if (clickedNavLink) {
        setActiveNavLink(clickedNavLink);
      } else if (isTop) {
        setActiveNavLink(null);
      }

      if (Math.abs(distance) < 4) return;

      isProgrammaticScroll = true;
      const duration = Math.min(900, Math.max(480, 420 + Math.abs(distance) * 0.12));
      let startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easeOutQuint(progress);

        window.scrollTo({
          top: startY + distance * easedProgress,
          behavior: "instant"
        });

        if (progress < 1) {
          activeScrollFrame = window.requestAnimationFrame(step);
        } else {
          activeScrollFrame = 0;
          isProgrammaticScroll = false;
          scheduleProgress();
        }
      }

      activeScrollFrame = window.requestAnimationFrame(step);
    }

    window.addEventListener("wheel", cancelActiveScroll, { passive: true });
    window.addEventListener("touchstart", cancelActiveScroll, { passive: true });
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        cancelActiveScroll();
      }
    });

    document.addEventListener("click", (event) => {
      if (!isPlainClick(event)) return;
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute("href");
      const isTop = hash === "#" || hash === "#top";
      const target = isTop ? document.body : document.getElementById(hash.slice(1));
      if (!target) return;

      event.preventDefault();
      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }

      const matchingNavLink = navigationLinks.find((navLink) => navLink.getAttribute("href") === hash) || null;
      animateScrollTo(target, isTop, matchingNavLink);
    });

    let frame = 0;
    const updateProgress = () => {
      const distance = root.scrollHeight - root.clientHeight;
      const progress = distance > 0 ? Math.max(0, Math.min(1, window.scrollY / distance)) : 0;
      if (progressBar) {
        progressBar.style.transform = `scaleX(${progress})`;
      }

      // Chỉ cập nhật tự động thanh gạch chân khi người dùng tự lăn chuột
      if (!isProgrammaticScroll) {
        const readingLine = Math.min(root.clientHeight, (header?.offsetHeight ?? 0) + 90);
        const current = navigationSections.findLast(({ section }) => section.getBoundingClientRect().top <= readingLine);
        const last = navigationSections.at(-1);
        const atEnd = distance > 0 && window.scrollY >= distance - 2;
        const visibleLink = atEnd && last?.section.getBoundingClientRect().top < root.clientHeight
          ? last.link
          : current?.link;

        setActiveNavLink(visibleLink || null);
      }
      frame = 0;
    };

    const scheduleProgress = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };

    window.addEventListener("scroll", scheduleProgress, { passive: true });
    window.addEventListener("resize", () => {
      syncHeaderHeight();
      scheduleProgress();
      if (activeLink) updateSlidingIndicator(activeLink);
    });

    if ("ResizeObserver" in window) {
      new ResizeObserver(scheduleProgress).observe(document.body);
      if (header) new ResizeObserver(syncHeaderHeight).observe(header);
    }
    syncHeaderHeight();
    updateProgress();

    // Rê chuột vào Menu trượt mượt thanh gạch chân đỏ
    navigationLinks.forEach((link) => {
      link.addEventListener("mouseenter", () => {
        updateSlidingIndicator(link);
      });
      link.addEventListener("mouseleave", () => {
        if (activeLink) {
          updateSlidingIndicator(activeLink);
        } else if (slidingIndicator) {
          slidingIndicator.classList.remove("active");
        }
      });
    });

    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let cardIndex = 0;
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          if (target.matches(".ximi-card, .phuong-stat-box")) {
            target.style.setProperty("--reveal-delay", `${Math.min(cardIndex++, 3) * 55}ms`);
          }
          target.classList.add("is-visible");
          observer.unobserve(target);
        });
      },
      { threshold: 0.1 }
    );

    const targets = ".reveal-on-scroll > :first-child, .site-main :is(.ximi-card, .phuong-stat-box)";
    document.querySelectorAll(targets).forEach((element) => {
      if (element.getBoundingClientRect().top <= window.innerHeight) return;
      element.classList.add("will-reveal");
      observer.observe(element);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadSavedBookPages();
    initCampaignCounter();
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
