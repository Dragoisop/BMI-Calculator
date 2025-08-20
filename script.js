(function () {
  'use strict';

  const unitRadios = /** @type {NodeListOf<HTMLInputElement>} */ (document.querySelectorAll('input[name="units"]'));
  const metricBlock = document.querySelector('.inputs-metric');
  const imperialBlock = document.querySelector('.inputs-imperial');

  const form = /** @type {HTMLFormElement | null} */ (document.getElementById('bmi-form'));
  const bmiValueEl = document.getElementById('bmi-value');
  const bmiLabelEl = document.getElementById('bmi-label');
  const resetBtn = document.getElementById('reset-btn');

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function roundToOneDecimal(value) {
    return Math.round(value * 10) / 10;
  }

  function classifyBmi(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  function highlightTable(bmi) {
    const tbody = document.querySelector('#bmi-table tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach((tr) => tr.classList.remove('highlight'));
    if (bmi < 18.5) tbody.querySelector('tr[data-range="under"]').classList.add('highlight');
    else if (bmi < 25) tbody.querySelector('tr[data-range="normal"]').classList.add('highlight');
    else if (bmi < 30) tbody.querySelector('tr[data-range="over"]').classList.add('highlight');
    else tbody.querySelector('tr[data-range="obese"]').classList.add('highlight');
  }

  function cmToMeters(cm) { return cm / 100; }
  function feetInchesToMeters(feet, inches) { return ((feet * 12) + inches) * 0.0254; }
  function poundsToKg(lb) { return lb * 0.45359237; }

  function calculateFromMetric(heightCm, weightKg) {
    const heightM = cmToMeters(heightCm);
    if (heightM <= 0) return null;
    return weightKg / (heightM * heightM);
  }

  function calculateFromImperial(heightFt, heightIn, weightLb) {
    const heightM = feetInchesToMeters(heightFt, heightIn);
    const kg = poundsToKg(weightLb);
    if (heightM <= 0) return null;
    return kg / (heightM * heightM);
  }

  function onUnitChange() {
    const selected = Array.from(unitRadios).find((r) => r.checked)?.value;
    if (selected === 'imperial') {
      metricBlock.classList.add('hidden');
      imperialBlock.classList.remove('hidden');
    } else {
      imperialBlock.classList.add('hidden');
      metricBlock.classList.remove('hidden');
    }
  }

  unitRadios.forEach((r) => r.addEventListener('change', onUnitChange));

  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    const selected = Array.from(unitRadios).find((r) => r.checked)?.value || 'metric';

    let bmi = null;
    if (selected === 'metric') {
      const heightCm = Number(document.getElementById('heightCm').value);
      const weightKg = Number(document.getElementById('weightKg').value);
      if (heightCm && weightKg) bmi = calculateFromMetric(heightCm, weightKg);
    } else {
      const heightFt = Number(document.getElementById('heightFt').value);
      const heightIn = Number(document.getElementById('heightIn').value);
      const weightLb = Number(document.getElementById('weightLb').value);
      if ((heightFt || heightIn) && weightLb) bmi = calculateFromImperial(heightFt, heightIn, weightLb);
    }

    if (bmi && Number.isFinite(bmi)) {
      const rounded = roundToOneDecimal(bmi);
      const label = classifyBmi(rounded);
      bmiValueEl.textContent = String(rounded);
      bmiLabelEl.textContent = label;
      highlightTable(rounded);
    } else {
      bmiValueEl.textContent = '—';
      bmiLabelEl.textContent = 'Please enter valid height and weight.';
      highlightTable(0);
    }
  });

  if (resetBtn) resetBtn.addEventListener('click', function () {
    if (bmiValueEl) bmiValueEl.textContent = '—';
    if (bmiLabelEl) bmiLabelEl.textContent = 'Enter your details to see results.';
    highlightTable(0);
  });

  // Contact form AJAX submission
  const contactForm = /** @type {HTMLFormElement | null} */ (document.querySelector('.contact-form'));
  const contactStatus = document.getElementById('contact-status');
  if (contactForm) {
    contactForm.addEventListener('submit', async function (event) {
      try {
        event.preventDefault();
        const submitBtn = /** @type {HTMLButtonElement | null} */ (contactForm.querySelector('button[type="submit"]'));
        const honeypot = /** @type {HTMLInputElement | null} */ (contactForm.querySelector('input[name="honeypot"]'));
        if (honeypot && honeypot.value) {
          // Bot detected; silently ignore to avoid giving feedback
          return;
        }

        const setButtonState = (state) => {
          if (!submitBtn) return;
          const original = submitBtn.getAttribute('data-original') || submitBtn.textContent || 'Send';
          if (!submitBtn.getAttribute('data-original')) submitBtn.setAttribute('data-original', original);
          submitBtn.classList.remove('is-loading', 'is-success', 'is-error');
          submitBtn.removeAttribute('aria-busy');
          submitBtn.disabled = (state === 'loading');
          if (state === 'loading') {
            submitBtn.textContent = 'Sending…';
            submitBtn.classList.add('is-loading');
            submitBtn.setAttribute('aria-busy', 'true');
          } else if (state === 'success') {
            submitBtn.textContent = 'Sent';
            submitBtn.classList.add('is-success');
          } else if (state === 'error') {
            submitBtn.textContent = 'Try again';
            submitBtn.classList.add('is-error');
          } else {
            submitBtn.textContent = original;
          }
        };

        if (contactStatus) {
          contactStatus.textContent = '';
          contactStatus.className = 'form-status';
        }
        setButtonState('loading');

        const formData = new FormData(contactForm);

        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          if (contactStatus) {
            contactStatus.textContent = '';
            contactStatus.className = 'form-status success';
          }
          contactForm.reset();
          setButtonState('success');
          setTimeout(() => setButtonState('idle'), 2000);
        } else {
          if (contactStatus) {
            contactStatus.textContent = 'Sorry, something went wrong. Please try again later.';
            contactStatus.className = 'form-status error';
          }
          setButtonState('error');
          setTimeout(() => setButtonState('idle'), 1500);
        }
      } catch (error) {
        if (contactStatus) {
          contactStatus.textContent = 'Network error. Please try again.';
          contactStatus.className = 'form-status error';
        }
      }
    });
  }

  // Mobile navigation toggle
  const navToggle = /** @type {HTMLButtonElement | null} */ (document.querySelector('.mobile-nav-toggle'));
  const primaryNav = /** @type {HTMLElement | null} */ (document.getElementById('primary-navigation'));
  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = primaryNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.classList.toggle('no-scroll', isOpen);
    });
    // Close on nav link click (mobile UX)
    primaryNav.addEventListener('click', (e) => {
      const target = e.target;
      if (target && target.tagName === 'A' && primaryNav.classList.contains('open')) {
        primaryNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('no-scroll');
      }
    });
  }
})();


