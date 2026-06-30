---
layout: layouts/base.njk
title: "Contact & Booking"
description: "Get in touch with Martin Splitt for SDI/TDI scuba diving training, guided lake/river dives, or private coaching in Zurich, Switzerland."
---

<section class="section" id="contact-intro-section">
  <div class="container" style="max-width: 800px; margin: 0 auto; text-align: center; margin-bottom: 3rem;">
    <span class="hero-tag">Let's Dive</span>
    <h1>Contact & Booking</h1>
    <p style="font-size: 1.15rem;">Have questions about SDI/TDI courses, guided dives, or want to schedule a personal coaching session? Send a message below and I will get back to you to discuss details.</p>
  </div>
</section>

<section class="section section-alt" id="contact-form-section">
  <div class="container">
    
    <!-- Form Status Messages -->
    <div id="form-status" style="display: none; margin-bottom: 2rem; padding: 1.5rem; border-radius: var(--border-radius); text-align: center; border: 1px solid transparent;">
      <p id="form-status-text" style="margin-bottom: 1rem; font-size: 1.1rem;"></p>
      <div id="form-fallback-action" style="display: none;">
        <a id="btn-mailto-fallback" class="btn btn-secondary" style="display: inline-block; background: linear-gradient(135deg, var(--color-secondary), #00a2cc); box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);">Send via Email Client</a>
      </div>
    </div>

    <form class="contact-form" action="https://formspree.io/f/xjgqewqq" method="post" id="booking-form">
      
      <div class="form-group">
        <label for="form-name" class="form-label">Full Name</label>
        <input type="text" id="form-name" name="name" class="form-control" placeholder="e.g. Jean Dupont" required>
      </div>
      
      <div class="form-group">
        <label for="form-email" class="form-label">Email Address</label>
        <input type="email" id="form-email" name="email" class="form-control" placeholder="e.g. jean@example.com" required>
      </div>

      <div class="form-group">
        <label for="form-subject" class="form-label">I am interested in:</label>
        <select id="form-subject" name="interest" class="form-control" style="background-color: rgba(2, 6, 23, 0.9);" required>
          <option value="" disabled selected>Select an option...</option>
          <option value="Beginner Courses (SDI)">Beginner / Recreational Courses (SDI)</option>
          <option value="Technical Courses (TDI)">Technical Diving Courses (TDI)</option>
          <option value="Guided Dives">Guided Swiss Dives (Lakes/Rivers)</option>
          <option value="Diver Coaching">Buoyancy, Trim & Propulsion Coaching</option>
          <option value="Other">General Inquiry</option>
        </select>
      </div>

      <div class="form-group">
        <label for="form-cert" class="form-label">Current Certification & Logged Dives</label>
        <input type="text" id="form-cert" name="certification" class="form-control" placeholder="e.g. Open Water, 15 dives (leave blank if beginner)">
      </div>
      
      <div class="form-group">
        <label for="form-message" class="form-label">Message</label>
        <textarea id="form-message" name="message" class="form-control" placeholder="Tell me about your diving goals, preferred dates, or specific training requirements..." required></textarea>
      </div>
      
      <div style="text-align: center; margin-top: 2rem;">
        <button type="submit" class="btn btn-primary" id="btn-form-submit" style="width: 100%;">Send Inquiry</button>
      </div>

    </form>
    
    <div style="margin-top: 4rem; text-align: center; color: var(--color-text-muted);">
      <p>Direct Email: <a href="mailto:martin@divingfor.fun" id="direct-email-link">martin@divingfor.fun</a></p>
      <p>Based in Zurich, Switzerland. We conduct dives in Lake Zurich, Lake Zug, Lake Thun, and Ticino rivers.</p>
    </div>
  </div>
</section>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('booking-form');
    const statusDiv = document.getElementById('form-status');
    const statusText = document.getElementById('form-status-text');
    const fallbackAction = document.getElementById('form-fallback-action');
    const mailtoFallbackBtn = document.getElementById('btn-mailto-fallback');
    const submitBtn = document.getElementById('btn-form-submit');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Update UI to loading state
      submitBtn.disabled = true;
      const originalSubmitText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      statusDiv.style.display = 'none';
      fallbackAction.style.display = 'none';

      // Gather form values for backup mailto
      const name = document.getElementById('form-name').value;
      const email = document.getElementById('form-email').value;
      const interest = document.getElementById('form-subject').value;
      const certification = document.getElementById('form-cert').value;
      const message = document.getElementById('form-message').value;

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          // Success!
          form.reset();
          form.style.display = 'none';
          statusDiv.style.display = 'block';
          statusDiv.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
          statusDiv.style.borderColor = '#10b981';
          statusText.style.color = '#10b981';
          statusText.innerHTML = '<strong>Success!</strong> Your inquiry has been sent. I will get back to you shortly!';
        } else {
          throw new Error('Server returned error status');
        }
      } catch (err) {
        // Error handling
        submitBtn.disabled = false;
        submitBtn.textContent = originalSubmitText;

        statusDiv.style.display = 'block';
        statusDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        statusDiv.style.borderColor = '#ef4444';
        statusText.style.color = '#ef4444';
        statusText.innerHTML = '<strong>Notice:</strong> We encountered an issue submitting your form automatically. You can send it directly using your email client instead without losing your message:';
        
        // Configure fallback mailto link
        const subject = `Diver Inquiry: ${interest}`;
        const body = `Name: ${name}
Email: ${email}
Interest: ${interest}
Certification & Dives: ${certification}

Message:
${message}`;
        
        const mailtoUrl = `mailto:martin@divingfor.fun?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        mailtoFallbackBtn.href = mailtoUrl;
        fallbackAction.style.display = 'block';
      }
    });
  });
</script>
