document.addEventListener("DOMContentLoaded", () => {
  const statsContainer = document.querySelector(".stats-container");
  const statCards = document.querySelectorAll(".stat-card");
  let hasAnimated = false;

  const animateNumbers = () => {
    statCards.forEach((card) => {
      const percentageElement = card.querySelector(".percentage");
      if (percentageElement && percentageElement.textContent.includes("%"))
        return;

      let currentNumber = 0;
      const targetNumber = parseInt(percentageElement.dataset.target);
      const duration = 2000;
      const startTime = performance.now();

      const updateNumber = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        currentNumber = progress * targetNumber;

        if (percentageElement) {
          percentageElement.textContent = Math.floor(currentNumber) + "%";
        }

        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        }
      };
      requestAnimationFrame(updateNumber);
    });
  };

  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.5,
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !hasAnimated) {
        animateNumbers();
        hasAnimated = true;
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  if (statsContainer) {
    observer.observe(statsContainer);
  }

  const solutionCards = document.querySelectorAll(".solution-card");

  solutionCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.classList.add("is-expanded");
    });

    card.addEventListener("mouseleave", () => {
      card.classList.remove("is-expanded");
    });
  });

  const isMobileView = () => {
    return window.innerWidth <= 767;
  };

  // Словарь для хранения всех экземпляров каруселей для удобного управления ресайзом
  const carouselInstances = {}; 

  const initializeCarousel = (
    wrapperSelector,
    trackSelector,
    contentSelector,
    prevBtnSelector,
    nextBtnSelector,
    cardSelector,
    cardWidthBase
  ) => {
    const track = document.querySelector(trackSelector);
    const contentContainer = document.querySelector(contentSelector);
    const prevButton = document.querySelector(prevBtnSelector);
    const nextButton = document.querySelector(nextBtnSelector);
    const cards = document.querySelectorAll(cardSelector);
    const wrapper = document.querySelector(wrapperSelector);

    if (
      !track ||
      cards.length === 0 ||
      !contentContainer ||
      !prevButton ||
      !nextButton
    ) {
      console.warn(`Carousel elements not found for selector: ${wrapperSelector}. Skipping initialization.`);
      return;
    }

    let currentIndex = 0;
    const cardMargin = 30;
    const cardWidth = cardWidthBase;
    const cardWidthTotal = cardWidth + cardMargin;
    let visibleCardsCount = 0;

    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;
    let isDragging = false;
    let startOffset = 0;

    let isScrolling = false;
    const scrollLockTime = 350;

    const autoScrollIntervalTime = 4000;
    let autoScrollInterval;

    const calculateVisibleCards = () => {
      const visibleAreaWidth = contentContainer.offsetWidth;
      visibleCardsCount = Math.floor((visibleAreaWidth + cardMargin) / cardWidthTotal);
      visibleCardsCount = Math.max(1, visibleCardsCount);
    };

    const moveTrack = () => {
      const offset = -currentIndex * cardWidthTotal;
      track.style.transform = `translateX(${offset}px)`;
      updateButtons();
    };

    const updateButtons = () => {
      const totalCards = cards.length;
      calculateVisibleCards();

      prevButton.disabled = currentIndex === 0;

      const maxIndexForButton = totalCards - visibleCardsCount;

      nextButton.disabled = currentIndex >= maxIndexForButton;
    };

    const getClosestIndex = (currentOffset) => {
      const absoluteOffset = Math.abs(currentOffset);

      let newIndex = Math.round(absoluteOffset / cardWidthTotal);

      const totalCards = cards.length;
      calculateVisibleCards();
      const maxScrollIndex = totalCards - visibleCardsCount;

      return Math.min(Math.max(0, newIndex), maxScrollIndex);
    };

    const safeScroll = (direction) => {
      if (isScrolling) return;

      isScrolling = true;

      let newIndex = currentIndex;
      const totalCards = cards.length;
      calculateVisibleCards();
      const maxScrollIndex = totalCards - visibleCardsCount;

      if (direction === "next" && currentIndex < maxScrollIndex) {
        newIndex++;
      } else if (direction === "prev" && currentIndex > 0) {
        newIndex--;
      } else if (direction === "autoNext") {
        newIndex = (currentIndex >= maxScrollIndex) ? 0 : currentIndex + 1;
      }

      if (newIndex !== currentIndex) {
        currentIndex = newIndex;
        moveTrack();
      }

      setTimeout(() => {
        isScrolling = false;
      }, scrollLockTime);
    };

    const startAutoScroll = () => {
      if (autoScrollInterval || nextButton.disabled) return;
      autoScrollInterval = setInterval(() => {
        safeScroll("autoNext");
      }, autoScrollIntervalTime);
    };

    const stopAutoScroll = () => {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    };

    nextButton.addEventListener("click", () => {
      stopAutoScroll();
      safeScroll("next");
    });
    prevButton.addEventListener("click", () => {
      stopAutoScroll();
      safeScroll("prev");
    });

    contentContainer.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) || e.ctrlKey) return;

      e.preventDefault();
      stopAutoScroll();

      const scrollThreshold = 10;

      if (e.deltaX > scrollThreshold) {
        safeScroll("next");
      } else if (e.deltaX < -scrollThreshold) {
        safeScroll("prev");
      }
    });

    contentContainer.addEventListener("touchstart", (e) => {
      stopAutoScroll();
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].screenX;
        const transformMatrix = new WebKitCSSMatrix(window.getComputedStyle(track).transform);
        startOffset = transformMatrix.m41;
        track.style.transition = 'none';
        isDragging = true; // Начало перетаскивания для touchmove
      }
    }, { passive: true });

    contentContainer.addEventListener("touchmove", (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const currentTouchX = e.touches[0].screenX;
      const dragDistance = currentTouchX - touchStartX;
      const newOffset = startOffset + dragDistance;
      track.style.transform = `translateX(${newOffset}px)`;
    });

    contentContainer.addEventListener("touchend", (e) => {
      if (!e.changedTouches[0]) return;
      isDragging = false; // Конец перетаскивания
      touchEndX = e.changedTouches[0].screenX;
      track.style.transition = '';
      handleSwipeGesture();
      startAutoScroll();
    });

    const handleSwipeGesture = () => {
      const distance = touchEndX - touchStartX;

      const transformMatrix = new WebKitCSSMatrix(window.getComputedStyle(track).transform);
      const currentOffset = transformMatrix.m41;

      if (Math.abs(distance) > swipeThreshold) {
        if (distance > 0) {
          safeScroll("prev");
        } else {
          safeScroll("next");
        }
      } else {
        currentIndex = getClosestIndex(currentOffset);
        moveTrack();
      }
    };

    contentContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      stopAutoScroll();
      touchStartX = e.pageX;

      const transformMatrix = new WebKitCSSMatrix(window.getComputedStyle(track).transform);
      startOffset = transformMatrix.m41;

      track.style.transition = 'none';

      contentContainer.classList.add('is-dragging');
      e.preventDefault();
    });

    contentContainer.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const currentMouseX = e.pageX;
      const dragDistance = currentMouseX - touchStartX;

      const newOffset = startOffset + dragDistance;

      track.style.transform = `translateX(${newOffset}px)`;
    });

    const endDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;

      contentContainer.classList.remove('is-dragging');
      track.style.transition = '';

      // В случае mouseleave, e.pageX может отсутствовать, поэтому используем touchEndX
      if (e.type === 'mouseup') {
        touchEndX = e.pageX;
      } else {
        // При mouseleave, просто берем текущее положение для расчета.
        // Более точный расчет: использовать transformMatrix, чтобы зафиксировать позицию.
        const currentTransformMatrix = new WebKitCSSMatrix(window.getComputedStyle(track).transform);
        const currentOffset = currentTransformMatrix.m41;
        touchEndX = currentOffset + touchStartX + startOffset; 
      }
      

      const transformMatrix = new WebKitCSSMatrix(window.getComputedStyle(track).transform);
      const currentOffset = transformMatrix.m41;

      const distance = touchEndX - touchStartX;

      if (Math.abs(distance) > swipeThreshold) {
        if (distance > 0) {
          safeScroll("prev");
        } else {
          safeScroll("next");
        }
      } else {
        currentIndex = getClosestIndex(currentOffset);
        moveTrack();
      }

      startAutoScroll();
    };

    contentContainer.addEventListener('mouseup', endDrag);
    contentContainer.addEventListener('mouseleave', endDrag);

    wrapper.addEventListener("mouseenter", stopAutoScroll);
    wrapper.addEventListener("mouseleave", startAutoScroll);
    
    // Функция для перезапуска карусели сбросом индекса (для ресайза)
    const resetCarousel = () => {
        stopAutoScroll(); 
        calculateVisibleCards(); // Пересчитываем видимые карточки 
        
        // Ограничиваем currentIndex, чтобы он не выходил за новые границы при ресайзе
        const totalCards = cards.length;
        const maxScrollIndex = totalCards - visibleCardsCount;
        currentIndex = Math.min(currentIndex, Math.max(0, maxScrollIndex)); 
        
        moveTrack(); // Перемещаем трек к новой (или сброшенной) позиции
        startAutoScroll();
    };

    // Сохраняем функцию ресайза для глобального обработчика
    carouselInstances[wrapperSelector] = resetCarousel;

    calculateVisibleCards();
    moveTrack();
    startAutoScroll();

    if (typeof WebKitCSSMatrix === 'undefined') {
      window.WebKitCSSMatrix = window.CSSMatrix || function(transform) {
        this.m41 = 0;
        if (transform && transform.includes('translateX')) {
          const match = transform.match(/translateX\(([^)]+)px\)/);
          if (match) {
            this.m41 = parseFloat(match[1]);
          }
        }
      };
    }
  };


  // === Глобальный обработчик ресайза для всех каруселей ===
  let resizeTimeout;
  window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
          // Если есть логика, которая должна запускаться только на десктопе, 
          // ее нужно будет перепроверить в момент ресайза.
          const isCurrentMobileView = isMobileView();
          
          // Для каждого экземпляра карусели, который мы инициализировали
          Object.keys(carouselInstances).forEach(selector => {
              // Специальная логика для каруселей, которые отключаются на мобильных
              if ((selector.includes('.block-4') || selector.includes('.block-7')) && isCurrentMobileView) {
                  // Здесь можно добавить логику "отключения" (если она нужна, но в данном случае просто не пересчитываем)
                  return; 
              }
              // Перезапускаем карусель
              carouselInstances[selector]();
          });
          
          // Дополнительная логика для случаев, когда карусели инициализируются 
          // или удаляются на ресайзе (когда isMobileView меняется)
          if (!isCurrentMobileView && !carouselInstances['.block-4 .carousel-wrapper']) {
              initializeCarousel(
                  ".block-4 .carousel-wrapper",
                  ".block-4 .carousel-track",
                  ".block-4 .carousel-content-container",
                  ".block-4 .prev-button",
                  ".block-4 .next-button",
                  ".block-4 .carousel-card",
                  330
              );
          }
          if (!isCurrentMobileView && !carouselInstances['.block-7 .reviews-carousel-wrapper']) {
              initializeCarousel(
                  ".block-7 .reviews-carousel-wrapper",
                  ".block-7 .reviews-track",
                  ".block-7 .reviews-content-container",
                  ".block-7 .reviews-prev-button",
                  ".block-7 .reviews-next-button",
                  ".block-7 .review-card-item",
                  400
              );
          }


      }, 150);
  });
  // =========================================================


  if (!isMobileView()) {
    initializeCarousel(
      ".block-4 .carousel-wrapper",
      ".block-4 .carousel-track",
      ".block-4 .carousel-content-container",
      ".block-4 .prev-button",
      ".block-4 .next-button",
      ".block-4 .carousel-card",
      330
    );
  }

  if (!isMobileView()) {
    initializeCarousel(
      ".block-7 .reviews-carousel-wrapper",
      ".block-7 .reviews-track",
      ".block-7 .reviews-content-container",
      ".block-7 .reviews-prev-button",
      ".block-7 .reviews-next-button",
      ".block-7 .review-card-item",
      400
    );
  }

  initializeCarousel(
    ".block-11 .team-carousel-wrapper",
    ".block-11 .team-track",
    ".block-11 .team-content-container",
    ".block-11 .team-prev-button",
    ".block-11 .team-next-button",
    ".block-11 .team-card-item",
    250
  );
});