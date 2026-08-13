  // Smooth scroll
  document.querySelectorAll('[data-scroll]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('mobile-menu').classList.remove('open');
    });
  });

  // Mobile menu toggle
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIcon = document.getElementById('menu-icon');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (menuIcon) {
        menuIcon.innerHTML = isOpen
          ? '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
          : '<line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line>';
      }
    });
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  revealEls.forEach((el, i) => {
    el.style.transitionDelay = (i % 6) * 60 + 'ms';
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));

  // Count-up stats
  const countEls = document.querySelectorAll('[data-countup]');
  const countIo = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.countup);
        const isDecimal = el.dataset.decimal === 'true';
        const duration = 900;
        const start = performance.now();
        function step(now) {
          const progress = Math.min((now - start) / duration, 1);
          const val = progress * target;
          el.textContent = isDecimal ? val.toFixed(2) : Math.floor(val);
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = isDecimal ? target.toFixed(2) : target;
        }
        requestAnimationFrame(step);
        countIo.unobserve(el);
      }
    });
  }, { threshold: 0.4 });
  countEls.forEach(el => countIo.observe(el));

  // Nav scroll state + active link
  const nav = document.getElementById('nav');
  const sections = ['home','about','education','experience','projects','skills','certifications','contact'];
  const navLinks = document.querySelectorAll('.nav-link');
  const backTop = document.getElementById('back-top');

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 16);
    backTop.classList.toggle('show', window.scrollY > 700);

    let current = 'home';
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 140) current = id;
    }
    navLinks.forEach(link => link.classList.toggle('active', link.dataset.scroll === current));
  }
  window.addEventListener('scroll', onScroll);
  onScroll();

  backTop.addEventListener('click', () => document.getElementById('home').scrollIntoView({ behavior: 'smooth' }));

  // --- Contact Form & Admin Inbox Logic ---

  // Storage Keys
  const PIN_KEY = 'admin_passcode';
  const KEY_KEY = 'web3forms_key';
  const MSG_KEY = 'inbox_messages';

  // Initialize Default passcode if not set
  if (!localStorage.getItem(PIN_KEY)) {
    localStorage.setItem(PIN_KEY, '1234');
  }

  // DOM Elements
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');

  const adminTrigger = document.getElementById('admin-trigger');
  const adminClose = document.getElementById('admin-close');
  const adminModal = document.getElementById('admin-modal');

  const loginScreen = document.getElementById('admin-login-screen');
  const pinInput = document.getElementById('admin-pin-input');
  const loginBtn = document.getElementById('admin-login-btn');
  const loginError = document.getElementById('admin-login-error');

  const dashboardScreen = document.getElementById('admin-dashboard-screen');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const unreadBadge = document.getElementById('unread-count-badge');

  const tabBtnMessages = document.getElementById('tab-btn-messages');
  const tabBtnSettings = document.getElementById('tab-btn-settings');
  const tabMessagesContent = document.getElementById('tab-messages-content');
  const tabSettingsContent = document.getElementById('tab-settings-content');

  const messageSearch = document.getElementById('message-search');
  const filterAllBtn = document.getElementById('filter-all-btn');
  const filterUnreadBtn = document.getElementById('filter-unread-btn');
  const messageList = document.getElementById('message-list');

  const detailsEmpty = document.getElementById('message-details-empty');
  const detailsContent = document.getElementById('message-details-content');
  const detailsSenderName = document.getElementById('details-sender-name');
  const detailsSenderEmail = document.getElementById('details-sender-email');
  const detailsDate = document.getElementById('details-date');
  const detailsMessageText = document.getElementById('details-message-text');
  const replyText = document.getElementById('reply-text');
  const sendReplyBtn = document.getElementById('send-reply-btn');
  const actionUnreadBtn = document.getElementById('action-unread-btn');
  const actionDeleteBtn = document.getElementById('action-delete-btn');

  const web3formsKeyInput = document.getElementById('web3forms-key-input');
  const newPinInput = document.getElementById('new-pin-input');
  const confirmPinInput = document.getElementById('confirm-pin-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const settingsStatusMsg = document.getElementById('settings-status-msg');

  // State
  let activeMessage = null;
  let currentFilter = 'all';
  let searchQuery = '';

  // Helpers
  function getMessages() {
    try {
      return JSON.parse(localStorage.getItem(MSG_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveMessages(msgs) {
    localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
  }

  // 1. Submit Form with Validation, Honeypot & Web3Forms Email Delivery
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(contactForm);
      const name = (formData.get('name') || '').trim();
      const email = (formData.get('email') || '').trim();
      const message = (formData.get('message') || '').trim();
      const botcheck = formData.get('botcheck');

      // Honeypot check: If bot filled the hidden checkbox, fake success & discard silently
      if (botcheck) {
        formStatus.textContent = 'Message sent successfully!';
        formStatus.className = 'form-status visible success';
        contactForm.reset();
        setTimeout(() => { formStatus.className = 'form-status'; }, 4000);
        return;
      }

      // Client-side Validation
      if (!name) {
        formStatus.textContent = 'Please enter your name.';
        formStatus.className = 'form-status visible error';
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        formStatus.textContent = 'Please enter a valid email address.';
        formStatus.className = 'form-status visible error';
        return;
      }

      if (!message) {
        formStatus.textContent = 'Please enter your message.';
        formStatus.className = 'form-status visible error';
        return;
      }

      // Always save to localStorage as local inbox cache
      const messages = getMessages();
      const newMsg = {
        id: 'msg_' + Date.now(),
        name,
        email,
        message,
        timestamp: new Date().toISOString(),
        read: false
      };
      messages.unshift(newMsg);
      saveMessages(messages);

      // UI Loading state
      submitBtn.disabled = true;
      formStatus.textContent = 'Sending message...';
      formStatus.className = 'form-status visible loading';

      const apiKey = localStorage.getItem(KEY_KEY) || '';
      let apiSuccess = false;
      let statusNote = '';

      if (apiKey) {
        // Submit to Web3Forms API
        try {
          const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              access_key: apiKey,
              name: name,
              email: email,
              message: message,
              subject: `New Portfolio Message from ${name}`
            })
          });
          const result = await response.json();
          apiSuccess = result.success;
          if (!apiSuccess) {
            statusNote = result.message || 'Email delivery failed.';
          }
        } catch (error) {
          console.error('Web3Forms API submit error:', error);
          apiSuccess = false;
          statusNote = 'Network error sending email.';
        }
      } else {
        // No key configured in settings yet
        apiSuccess = true;
        statusNote = ' (Saved to local inbox demo)';
      }

      submitBtn.disabled = false;
      if (apiSuccess) {
        formStatus.textContent = `Message sent successfully!${statusNote}`;
        formStatus.className = 'form-status visible success';
        contactForm.reset();
        setTimeout(() => {
          formStatus.className = 'form-status';
        }, 5000);
      } else {
        formStatus.textContent = `Saved to local inbox, but email delivery failed: ${statusNote}`;
        formStatus.className = 'form-status visible error';
        setTimeout(() => {
          formStatus.className = 'form-status';
        }, 6000);
      }
    });
  }

  // 2. Open/Close Modal & Focus Trap Management
  let previousActiveElement = null;

  function openAdminModal() {
    previousActiveElement = document.activeElement;
    adminModal.classList.add('show');
    adminModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (sessionStorage.getItem('admin_logged_in') === 'true') {
      showDashboard();
    } else {
      showLogin();
    }
  }

  function closeAdminModal() {
    adminModal.classList.remove('show');
    adminModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  }

  if (adminTrigger) {
    adminTrigger.addEventListener('click', openAdminModal);
  }

  if (adminClose) {
    adminClose.addEventListener('click', closeAdminModal);
  }

  // Close modal on click outside content
  window.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      closeAdminModal();
    }
  });

  // Close on Escape key & Keyboard Focus Trap within Modal
  window.addEventListener('keydown', (e) => {
    if (!adminModal.classList.contains('show')) return;

    if (e.key === 'Escape') {
      closeAdminModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = adminModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const visibleFocusables = Array.from(focusables).filter(
        el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
      );

      if (visibleFocusables.length === 0) return;

      const firstEl = visibleFocusables[0];
      const lastEl = visibleFocusables[visibleFocusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    }
  });

  // 3. Login Flow
  function showLogin() {
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
    pinInput.value = '';
    loginError.textContent = '';
    setTimeout(() => pinInput.focus(), 100);
  }

  function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    sessionStorage.setItem('admin_logged_in', 'true');
    
    // Reset tabs
    switchTab('messages');
    
    // Load Settings Values
    web3formsKeyInput.value = localStorage.getItem(KEY_KEY) || '';
    newPinInput.value = '';
    confirmPinInput.value = '';
    settingsStatusMsg.textContent = '';
    settingsStatusMsg.className = 'settings-status';

    // Refresh inbox
    refreshInbox();
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  if (pinInput) {
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  function handleLogin() {
    const pinVal = pinInput.value;
    const correctPin = localStorage.getItem(PIN_KEY) || '1234';
    if (pinVal === correctPin) {
      showDashboard();
    } else {
      loginError.textContent = 'Incorrect passcode. Try again.';
      pinInput.value = '';
      pinInput.focus();
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('admin_logged_in');
      showLogin();
    });
  }

  // 4. Tab Navigation
  function switchTab(tab) {
    if (tab === 'messages') {
      tabBtnMessages.classList.add('active');
      tabBtnSettings.classList.remove('active');
      tabMessagesContent.classList.remove('hidden');
      tabSettingsContent.classList.add('hidden');
    } else {
      tabBtnMessages.classList.remove('active');
      tabBtnSettings.classList.add('active');
      tabMessagesContent.classList.add('hidden');
      tabSettingsContent.classList.remove('hidden');
    }
  }

  if (tabBtnMessages) {
    tabBtnMessages.addEventListener('click', () => switchTab('messages'));
  }
  if (tabBtnSettings) {
    tabBtnSettings.addEventListener('click', () => switchTab('settings'));
  }

  // 5. Inbox Operations
  function refreshInbox() {
    const messages = getMessages();
    
    // Update Badge
    const unreadCount = messages.filter(m => !m.read).length;
    unreadBadge.textContent = `${unreadCount} New`;
    unreadBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';

    renderMessageList();
  }

  function renderMessageList() {
    const messages = getMessages();
    messageList.innerHTML = '';

    // Filter
    let filtered = messages;
    if (currentFilter === 'unread') {
      filtered = messages.filter(m => !m.read);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.email.toLowerCase().includes(q) || 
        m.message.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      messageList.innerHTML = `<div class="message-list-empty">No messages found</div>`;
      return;
    }

    filtered.forEach(msg => {
      const item = document.createElement('div');
      item.className = `message-item ${msg.read ? '' : 'unread'} ${activeMessage && activeMessage.id === msg.id ? 'active' : ''}`;
      
      const dateStr = formatDate(msg.timestamp);

      item.innerHTML = `
        <div class="message-item-header">
          <div class="message-item-name">${escapeHTML(msg.name)}</div>
          <div class="message-item-time">${dateStr}</div>
        </div>
        <div class="message-item-snippet">${escapeHTML(msg.message)}</div>
      `;

      item.addEventListener('click', () => selectMessage(msg));
      messageList.appendChild(item);
    });
  }

  function selectMessage(msg) {
    activeMessage = msg;
    
    // Mark as read
    if (!msg.read) {
      const messages = getMessages();
      const index = messages.findIndex(m => m.id === msg.id);
      if (index !== -1) {
        messages[index].read = true;
        saveMessages(messages);
      }
      refreshInbox();
    } else {
      renderMessageList();
    }

    // Populate detail view
    detailsSenderName.textContent = msg.name;
    detailsSenderEmail.textContent = msg.email;
    detailsSenderEmail.href = `mailto:${msg.email}`;
    detailsDate.textContent = formatDateFull(msg.timestamp);
    detailsMessageText.textContent = msg.message;
    replyText.value = '';

    detailsEmpty.classList.add('hidden');
    detailsContent.classList.remove('hidden');
  }

  // 6. Message Actions
  if (actionUnreadBtn) {
    actionUnreadBtn.addEventListener('click', () => {
      if (!activeMessage) return;
      const messages = getMessages();
      const index = messages.findIndex(m => m.id === activeMessage.id);
      if (index !== -1) {
        messages[index].read = false;
        saveMessages(messages);
      }
      activeMessage = null;
      detailsEmpty.classList.remove('hidden');
      detailsContent.classList.add('hidden');
      refreshInbox();
    });
  }

  if (actionDeleteBtn) {
    actionDeleteBtn.addEventListener('click', () => {
      if (!activeMessage) return;
      if (!confirm('Are you sure you want to delete this message?')) return;
      
      const messages = getMessages();
      const filtered = messages.filter(m => m.id !== activeMessage.id);
      saveMessages(filtered);
      
      activeMessage = null;
      detailsEmpty.classList.remove('hidden');
      detailsContent.classList.add('hidden');
      refreshInbox();
    });
  }

  // Reply Draft
  if (sendReplyBtn) {
    sendReplyBtn.addEventListener('click', () => {
      if (!activeMessage) return;
      const replyBody = replyText.value.trim();
      if (!replyBody) {
        alert('Please write a reply before sending.');
        return;
      }

      const subject = `Re: Message from Portfolio`;
      const mailtoLink = `mailto:${activeMessage.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(replyBody)}`;
      
      // Open in system mail application
      window.location.href = mailtoLink;
    });
  }

  // Search & Filter
  if (messageSearch) {
    messageSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMessageList();
    });
  }

  if (filterAllBtn) {
    filterAllBtn.addEventListener('click', () => {
      currentFilter = 'all';
      filterAllBtn.classList.add('active');
      filterUnreadBtn.classList.remove('active');
      renderMessageList();
    });
  }

  if (filterUnreadBtn) {
    filterUnreadBtn.addEventListener('click', () => {
      currentFilter = 'unread';
      filterAllBtn.classList.remove('active');
      filterUnreadBtn.classList.add('active');
      renderMessageList();
    });
  }

  // Settings Save
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const apiKeyVal = web3formsKeyInput.value.trim();
      const newPinVal = newPinInput.value;
      const confirmPinVal = confirmPinInput.value;

      // 1. Save Web3Forms Key
      localStorage.setItem(KEY_KEY, apiKeyVal);

      // 2. Save Passcode if changed
      if (newPinVal || confirmPinVal) {
        if (newPinVal !== confirmPinVal) {
          settingsStatusMsg.textContent = 'Passcodes do not match.';
          settingsStatusMsg.className = 'settings-status error';
          return;
        }
        if (newPinVal.length < 4) {
          settingsStatusMsg.textContent = 'Passcode must be at least 4 digits.';
          settingsStatusMsg.className = 'settings-status error';
          return;
        }
        localStorage.setItem(PIN_KEY, newPinVal);
      }

      settingsStatusMsg.textContent = 'Settings saved successfully!';
      settingsStatusMsg.className = 'settings-status success';
      newPinInput.value = '';
      confirmPinInput.value = '';

      setTimeout(() => {
        settingsStatusMsg.textContent = '';
        settingsStatusMsg.className = 'settings-status';
      }, 3000);
    });
  }

  // Utility Date Formatters
  function formatDate(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    
    // Check if today
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise format date
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatDateFull(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
