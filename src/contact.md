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
    <form class="contact-form" action="mailto:martin@divingfor.fun" method="post" enctype="text/plain" id="booking-form">
      
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
