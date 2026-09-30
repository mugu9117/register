/**
 * Sengunthar Engineering College – Quiz Registration
 * Client-side script handling form validation & Google Apps Script submission.
 */

// Replace with your deployed Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKxmfJ9T0RBRs18rUWLN0-wcaAs_5lZfFAIyvYW0uO6Pa1K_uSoEkvGWCC6nZaZAQCDQ/exec";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quizRegistrationForm");
  const submitBtn = document.getElementById("submitBtn");
  const btnText = submitBtn.querySelector(".btn-text");
  const statusMessage = document.getElementById("statusMessage");
  const statusTitle = document.getElementById("statusTitle");
  const statusText = document.getElementById("statusText");
  const statusIcon = document.getElementById("statusIcon");

  // Input elements
  const nameInput = document.getElementById("name");
  const collegeInput = document.getElementById("collegeName");
  const phoneInput = document.getElementById("phoneNo");
  const gmailInput = document.getElementById("gmail");

  // Restrict phone input to numbers only
  phoneInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    validatePhone(false);
  });

  // Real-time input listeners to clear errors as user types
  nameInput.addEventListener("input", () => validateName(false));
  collegeInput.addEventListener("input", () => validateCollege(false));
  gmailInput.addEventListener("input", () => validateGmail(false));

  /**
   * Helper functions to display / clear field errors
   */
  function setError(inputEl, groupEl, errorEl, message) {
    groupEl.classList.add("has-error");
    groupEl.classList.remove("is-valid");
    errorEl.textContent = message;
    errorEl.style.display = "block";
  }

  function clearError(inputEl, groupEl, errorEl) {
    groupEl.classList.remove("has-error");
    if (inputEl.value.trim() !== "") {
      groupEl.classList.add("is-valid");
    } else {
      groupEl.classList.remove("is-valid");
    }
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  /**
   * Field Validation Handlers
   */
  function validateName(showError = true) {
    const val = nameInput.value.trim();
    const group = document.getElementById("group-name");
    const err = document.getElementById("error-name");

    if (!val) {
      if (showError) setError(nameInput, group, err, "Please enter your name.");
      return false;
    }
    if (val.length < 2) {
      if (showError) setError(nameInput, group, err, "Name must be at least 2 characters.");
      return false;
    }
    clearError(nameInput, group, err);
    return true;
  }

  function validateCollege(showError = true) {
    const val = collegeInput.value.trim();
    const group = document.getElementById("group-college");
    const err = document.getElementById("error-college");

    if (!val) {
      if (showError) setError(collegeInput, group, err, "Please enter your college name.");
      return false;
    }
    clearError(collegeInput, group, err);
    return true;
  }

  function validatePhone(showError = true) {
    const val = phoneInput.value.trim();
    const group = document.getElementById("group-phone");
    const err = document.getElementById("error-phone");
    // Indian 10-digit mobile number pattern: Starts with 6, 7, 8, or 9 followed by 9 digits
    const phoneRegex = /^[6-9]\d{9}$/;

    if (!val) {
      if (showError) setError(phoneInput, group, err, "Please enter your mobile number.");
      return false;
    }
    if (val.length !== 10) {
      if (showError) setError(phoneInput, group, err, "Phone number must contain exactly 10 digits.");
      return false;
    }
    if (!phoneRegex.test(val)) {
      if (showError) setError(phoneInput, group, err, "Please enter a valid 10-digit Indian mobile number.");
      return false;
    }
    clearError(phoneInput, group, err);
    return true;
  }

  function validateGmail(showError = true) {
    const val = gmailInput.value.trim();
    const group = document.getElementById("group-gmail");
    const err = document.getElementById("error-gmail");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!val) {
      if (showError) setError(gmailInput, group, err, "Please enter your email address.");
      return false;
    }
    if (!emailRegex.test(val)) {
      if (showError) setError(gmailInput, group, err, "Please enter a valid email address.");
      return false;
    }
    clearError(gmailInput, group, err);
    return true;
  }

  /**
   * Display Status Banner Notification
   */
  function showStatus(type, title, message) {
    statusMessage.className = `status-message ${type}`;
    statusTitle.textContent = title;
    statusText.textContent = message;

    if (type === "success") {
      statusIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    } else {
      statusIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    }

    statusMessage.style.display = "flex";
    statusMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideStatus() {
    statusMessage.style.display = "none";
  }

  /**
   * Form Submission Handler
   */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideStatus();

    // 1. Validate all fields
    const isNameValid = validateName(true);
    const isCollegeValid = validateCollege(true);
    const isPhoneValid = validatePhone(true);
    const isGmailValid = validateGmail(true);

    if (!isNameValid || !isCollegeValid || !isPhoneValid || !isGmailValid) {
      return;
    }

    // Prepare Payload
    const name = nameInput.value.trim();
    const collegeName = collegeInput.value.trim();
    const phoneNo = phoneInput.value.trim();
    const gmail = gmailInput.value.trim();

    const payload = {
      name: name,
      college_name: collegeName,
      phone_no: phoneNo,
      gmail: gmail
    };

    // 2. Disable button & 3. Change button text to Registering...
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
    btnText.textContent = "Registering...";

    try {
      if (GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
        // Mock successful registration in development mode with helpful guidance
        console.warn("GOOGLE_SCRIPT_URL is not configured yet. Simulating registration...");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 5. If successful, display Registration Successful!
        showStatus("success", "Registration Successful!", "Your response has been recorded. Thank you for participating.");

        // 6. Clear all form fields
        form.reset();
        document.querySelectorAll(".form-group").forEach((group) => {
          group.classList.remove("is-valid", "has-error");
        });
        return;
      }

      // 4. Send the data to Google Apps Script Web App
      // Using mode: 'no-cors' and text/plain to ensure Google Apps Script redirects do not trigger browser CORS errors
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        cache: "no-cache",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      // 5. Populate and show Success Confirmation View
      document.getElementById("receiptName").textContent = name;
      document.getElementById("receiptCollege").textContent = collegeName;
      document.getElementById("receiptPhone").textContent = phoneNo;
      document.getElementById("receiptGmail").textContent = gmail;

      // Hide form and display success view
      form.style.display = "none";
      const successView = document.getElementById("successView");
      if (successView) {
        successView.style.display = "flex";
      }

      // Also set status banner if needed
      showStatus("success", "Registration Successful!", "Your response has been recorded in the Google Sheet.");

      // 6. Clear form fields
      form.reset();
      document.querySelectorAll(".form-group").forEach((group) => {
        group.classList.remove("is-valid", "has-error");
      });

    } catch (error) {
      console.error("Submission Error:", error);
      // Display Registration failed message
      showStatus("error", "Registration failed.", "Please try again later or check your internet connection.");
    } finally {
      // 7. Change the button back to Register and enable it
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
      btnText.textContent = "Register";
    }
  });

  // Handle "Register Another Participant" button
  const registerAnotherBtn = document.getElementById("registerAnotherBtn");
  if (registerAnotherBtn) {
    registerAnotherBtn.addEventListener("click", () => {
      const successView = document.getElementById("successView");
      if (successView) successView.style.display = "none";
      form.style.display = "flex";
      hideStatus();
      nameInput.focus();
    });
  }
});
