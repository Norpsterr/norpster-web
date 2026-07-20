let isDragging = false;
let currentModal = null;
let offsetX = 0;
let offsetY = 0;
let lastFocusedElement = null;
let snapBackTimer = null;
let suppressBackdropClick = false;
const closeTimers = {};

function toggleProjectsView() {
    const isActive = document.body.classList.toggle('projects-view');
    document.documentElement.classList.toggle('projects-view');

    document.querySelector('.nav-item[aria-pressed]').setAttribute('aria-pressed', isActive);

    if (!isActive) {
        window.scrollTo(0, 0);
    }
}

function openModal(section) {
    const modal = document.getElementById(section + '-modal');

    // Handle opening and closing in quick succession
    clearTimeout(closeTimers[section]);
    modal.classList.remove('closing');

    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.transition = '';
    modalContent.style.left = '';
    modalContent.style.top = '';
    modalContent.style.transform = '';
    modalContent.style.opacity = '';

    lastFocusedElement = document.activeElement;

    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    modal.offsetHeight;

    modal.classList.add('active');

    // screen-reader user stuff
    const closeButton = modal.querySelector('.modal-close');
    if (closeButton) closeButton.focus();
}

function closeModal(section) {
    const modal = document.getElementById(section + '-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    modal.classList.add('closing');

    closeTimers[section] = setTimeout(() => {
        modal.classList.remove('active');
        modal.classList.remove('closing');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        
        modalContent.style.left = '50%';
        modalContent.style.top = '50%';
        modalContent.style.transform = '';
        modalContent.style.opacity = '';

        if (lastFocusedElement) {
            lastFocusedElement.focus();
            lastFocusedElement = null;
        }
    }, 250);
}

function closeModalOnBackdrop(event, section) {
    const wasDragRelease = suppressBackdropClick;
    suppressBackdropClick = false;

    if (!wasDragRelease && event.target.classList.contains('modal')) {
        closeModal(section);
    }
}

function openProjectModal(card) {
    const img = card.querySelector('.project-image');
    const titleEl = card.querySelector('.project-title');
    const title = (titleEl && titleEl.textContent.trim()) || img.alt;

    document.getElementById('project-modal-title').textContent = title;

    const modalImg = document.getElementById('project-modal-image');
    modalImg.src = card.dataset.full || img.src;
    modalImg.alt = img.alt;

    const imageLink = document.getElementById('project-modal-link');
    const href = card.getAttribute('href');

    if (href) {
        imageLink.href = href;
        imageLink.setAttribute('aria-label', 'View original post: ' + img.alt);
    } else {
        imageLink.removeAttribute('href');
        imageLink.removeAttribute('aria-label');
    }

    openModal('project');
}

document.querySelector('.projects-grid').addEventListener('click', function(e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const card = e.target.closest('.project-card');
    if (!card) return;

    e.preventDefault();
    openProjectModal(card);
});

document.querySelector('.projects-grid').addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    const card = e.target.closest('.project-card');
    if (!card || card.hasAttribute('href')) return;

    e.preventDefault();
    openProjectModal(card);
});

document.querySelectorAll('.modal-header').forEach(header => {
    header.addEventListener('pointerdown', function(e) {
        if (e.target.classList.contains('modal-close')) return;
        
        isDragging = true;
        currentModal = this.parentElement;
        suppressBackdropClick = true;

        this.setPointerCapture(e.pointerId);

        const rect = currentModal.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        clearTimeout(snapBackTimer);
        currentModal.classList.add('dragging');
        currentModal.style.transition = '';
        currentModal.style.transform = 'none';
        currentModal.style.left = rect.left + 'px';
        currentModal.style.top = rect.top + 'px';
    });
});

document.addEventListener('pointermove', function(e) {
    if (isDragging && currentModal) {
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        
        const rect = currentModal.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const resistanceZone = 120; 
        
        // resistance left
        if (newX < resistanceZone) {
            const distance = resistanceZone - newX;
            const resistance = Math.min(distance / resistanceZone, 0.8) * 0.65;
            newX = newX + (distance * resistance);
        }
        
        // resistance right
        if (newX + rect.width > windowWidth - resistanceZone) {
            const distance = (newX + rect.width) - (windowWidth - resistanceZone);
            const resistance = Math.min(distance / resistanceZone, 0.8) * 0.65;
            newX = newX - (distance * resistance);
        }
        
        // resistance top — lighter than the other edges
        if (newY < resistanceZone) {
            const distance = resistanceZone - newY;
            const resistance = Math.min(distance / resistanceZone, 0.8) * 0.35;
            newY = newY + (distance * resistance);
        }
        
        // resistance bottom
        if (newY + rect.height > windowHeight - resistanceZone) {
            const distance = (newY + rect.height) - (windowHeight - resistanceZone);
            const resistance = Math.min(distance / resistanceZone, 0.8) * 0.65;
            newY = newY - (distance * resistance);
        }
        
        currentModal.style.left = newX + 'px';
        currentModal.style.top = newY + 'px';
    }
});

function endDrag() {
    if (isDragging && currentModal) {
        const modalContent = currentModal;
        modalContent.classList.remove('dragging');
        
        const rect = modalContent.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const threshold = 50;
        const safeZone = 120;

        const marginX = Math.min(safeZone, (windowWidth - rect.width) / 2);
        const marginY = Math.min(safeZone, (windowHeight - rect.height) / 2);

        let newLeft = rect.left;
        let newTop = rect.top;
        let needsAdjustment = false;

        // Check left edge
        if (rect.left < threshold) {
            newLeft = marginX;
            needsAdjustment = true;
        }

        // Check right edge
        if (rect.right > windowWidth - threshold) {
            newLeft = windowWidth - marginX - rect.width;
            needsAdjustment = true;
        }

        // Check top edge
        if (rect.top < threshold) {
            newTop = marginY;
            needsAdjustment = true;
        }

        // Check bottom edge
        if (rect.bottom > windowHeight - threshold) {
            newTop = windowHeight - marginY - rect.height;
            needsAdjustment = true;
        }

        if (needsAdjustment) {
            // handle small screens resistance on modals
            newLeft = Math.max(8, Math.min(newLeft, windowWidth - rect.width - 8));
            newTop = Math.max(8, Math.min(newTop, windowHeight - rect.height - 8));

            modalContent.style.transition = 'left 0.6s ease, top 0.6s ease, opacity 0.25s ease';
            modalContent.style.left = newLeft + 'px';
            modalContent.style.top = newTop + 'px';

            snapBackTimer = setTimeout(() => {
                modalContent.style.transition = '';
            }, 650);
        }
    }
    
    isDragging = false;
    currentModal = null;
}

document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

// Keyboard support
document.addEventListener('keydown', function(e) {
    const activeModal = document.querySelector('.modal.active');
    if (!activeModal) return;

    if (e.key === 'Escape') {
        closeModal(activeModal.id.replace('-modal', ''));
        return;
    }

    if (e.key === 'Tab') {
        const focusable = activeModal.querySelectorAll('a[href]:not([hidden]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});