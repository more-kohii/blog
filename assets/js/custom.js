/**
 * Main JS file for Scriptor behaviours
 */

// Responsive video embeds
let videoEmbeds = [
  'iframe[src*="youtube.com"]',
  'iframe[src*="vimeo.com"]'
];
reframe(videoEmbeds.join(','));

// Menu on small screens
let menuToggle = document.querySelectorAll('.menu-toggle');
if (menuToggle) {
  for (let i = 0; i < menuToggle.length; i++) {
    menuToggle[i].addEventListener('click', function (e) {
      document.body.classList.toggle('menu--opened');
      e.preventDefault();
    }, false);
  }
}

// Table of Contents
(function() {
  const tocNav = document.getElementById('toc-nav');
  const toc = document.getElementById('toc');
  const postContent = document.querySelector('.post-content');
  
  if (!tocNav || !postContent) return;

  // 헤딩 요소들 찾기
  const headings = postContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  if (headings.length === 0) return;

  // 목차 생성
  function generateTOC() {
    const tocList = document.createElement('ul');
    let currentLevel = 0;
    let currentList = tocList;
    const listStack = [tocList];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const id = heading.id || `heading-${index}`;
      
      // ID가 없으면 추가
      if (!heading.id) {
        heading.id = id;
      }

      // 레벨이 증가하면 새 리스트 생성
      if (level > currentLevel) {
        const newList = document.createElement('ul');
        currentList.lastElementChild?.appendChild(newList);
        listStack.push(newList);
        currentList = newList;
      }
      // 레벨이 감소하면 상위 리스트로 이동
      else if (level < currentLevel) {
        const diff = currentLevel - level;
        for (let i = 0; i < diff; i++) {
          listStack.pop();
        }
        currentList = listStack[listStack.length - 1];
      }

      // 목차 항목 생성
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = heading.textContent.trim();
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.getElementById(id);
        if (target) {
          const offsetTop = target.offsetTop - 80; // 헤더 높이 고려
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
          // URL 업데이트 (선택사항)
          history.pushState(null, null, `#${id}`);
        }
      });
      
      listItem.appendChild(link);
      currentList.appendChild(listItem);
      currentLevel = level;
    });

    tocNav.appendChild(tocList);
    
    // 목차가 있으면 표시
    if (window.innerWidth > 1200) {
      toc.style.display = 'block';
    }
  }

  // 현재 보이는 헤딩에 따라 활성화
  function updateActiveTOC() {
    if (window.innerWidth <= 1200) return;
    
    const scrollPos = window.scrollY + 100;
    let currentActive = null;

    headings.forEach((heading) => {
      const headingTop = heading.offsetTop;
      if (scrollPos >= headingTop) {
        currentActive = heading.id;
      }
    });

    // 활성 클래스 업데이트
    tocNav.querySelectorAll('a').forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentActive}`) {
        link.classList.add('active');
      }
    });
  }

  // 스크롤 이벤트 (throttle)
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        updateActiveTOC();
        ticking = false;
      });
      ticking = true;
    }
  }

  // 초기화
  generateTOC();
  updateActiveTOC();
  
  // 이벤트 리스너
  window.addEventListener('scroll', onScroll);
  window.addEventListener('resize', function() {
    if (window.innerWidth > 1200) {
      toc.style.display = 'block';
    } else {
      toc.style.display = 'none';
    }
  });
})();

// Reference 북마크 변환
(function() {
  const postContent = document.querySelector('.post-content');
  if (!postContent) return;

  // Reference 섹션 찾기
  const referenceHeadings = Array.from(postContent.querySelectorAll('h2, h3')).filter(heading => {
    const text = heading.textContent.toLowerCase();
    return text.includes('reference') || text.includes('참고') || text.includes('references');
  });

  referenceHeadings.forEach(heading => {
    heading.classList.add('reference-heading');
    
    // 다음 헤딩까지의 내용 찾기
    let current = heading.nextElementSibling;
    const referenceSection = document.createElement('div');
    referenceSection.className = 'references';

    while (current && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(current.tagName)) {
      const next = current.nextElementSibling;
      
      // 링크가 있는 요소 찾기
      if (current.tagName === 'P') {
        const links = current.querySelectorAll('a[href^="http"]');
        links.forEach(link => {
          const bookmark = createBookmark(link, current.textContent.trim());
          if (bookmark) {
            referenceSection.appendChild(bookmark);
          }
        });
        // 처리된 요소는 숨김
        if (links.length > 0) {
          current.style.display = 'none';
        }
      }
      
      // ul/ol 리스트인 경우
      if (current.tagName === 'UL' || current.tagName === 'OL') {
        const listItems = current.querySelectorAll('li');
        listItems.forEach(li => {
          const link = li.querySelector('a[href^="http"]');
          if (link) {
            const linkText = link.textContent.trim();
            const liText = li.textContent.trim().replace(linkText, '').trim();
            const bookmark = createBookmark(link, liText || linkText);
            if (bookmark) {
              referenceSection.appendChild(bookmark);
            }
          }
        });
        // 처리된 리스트는 숨김
        if (listItems.length > 0) {
          current.style.display = 'none';
        }
      }
      
      current = next;
    }

    // Reference 섹션 삽입
    if (referenceSection.children.length > 0) {
      heading.parentNode.insertBefore(referenceSection, heading.nextSibling);
    }
  });

  async function createBookmark(link, description) {
    const url = link.href;
    const title = link.textContent.trim() || url;
    
    const bookmark = document.createElement('a');
    bookmark.href = url;
    bookmark.target = '_blank';
    bookmark.rel = 'noopener noreferrer';
    bookmark.className = 'bookmark reference-item';

    const content = document.createElement('div');
    content.className = 'bookmark-content';

    const info = document.createElement('div');
    info.className = 'bookmark-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'bookmark-title';
    titleEl.textContent = title;

    const urlEl = document.createElement('div');
    urlEl.className = 'bookmark-url';
    try {
      urlEl.textContent = new URL(url).hostname.replace('www.', '');
    } catch (e) {
      urlEl.textContent = url;
    }

    info.appendChild(titleEl);
    if (description && description !== title && description.length > 0) {
      const descEl = document.createElement('div');
      descEl.className = 'bookmark-description';
      descEl.textContent = description;
      info.appendChild(descEl);
    }
    info.appendChild(urlEl);

    // 이미지 추가 (favicon 사용)
    try {
      const imageEl = document.createElement('div');
      imageEl.className = 'bookmark-image';
      const domain = new URL(url).hostname.replace('www.', '');
      imageEl.style.backgroundImage = `url('https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64')`;
      content.appendChild(imageEl);
    } catch (e) {
      // 이미지 실패 시 무시
    }

    content.insertBefore(info, content.firstChild);
    bookmark.appendChild(content);

    return bookmark;
  }
})();
