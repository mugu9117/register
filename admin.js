/**
 * Sengunthar Engineering College – Quiz Registration Admin Panel
 * Handles data fetching, live search, edit/alter details, deletion, and CSV export.
 */

// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKxmfJ9T0RBRs18rUWLN0-wcaAs_5lZfFAIyvYW0uO6Pa1K_uSoEkvGWCC6nZaZAQCDQ/exec";

// Admin credentials (can be updated here)
const ADMIN_PASSCODE = "admin123";

// State
let participantsData = [];
let filteredData = [];

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminPasscodeInput = document.getElementById("adminPasscode");
  const loginError = document.getElementById("loginError");
  const logoutBtn = document.getElementById("logoutBtn");

  const searchInput = document.getElementById("searchInput");
  const refreshBtn = document.getElementById("refreshBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const openAddModalBtn = document.getElementById("openAddModalBtn");

  const tableBody = document.getElementById("tableBody");
  const tableLoading = document.getElementById("tableLoading");
  const tableEmpty = document.getElementById("tableEmpty");
  const showingCountText = document.getElementById("showingCountText");

  const statTotalCount = document.getElementById("statTotalCount");
  const statCollegesCount = document.getElementById("statCollegesCount");
  const statStatus = document.getElementById("statStatus");

  // Edit Modal Elements
  const editModal = document.getElementById("editModal");
  const editForm = document.getElementById("editForm");
  const editRowId = document.getElementById("editRowId");
  const editName = document.getElementById("editName");
  const editCollege = document.getElementById("editCollege");
  const editPhone = document.getElementById("editPhone");
  const editGmail = document.getElementById("editGmail");
  const closeEditModalBtn = document.getElementById("closeEditModalBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const saveEditBtn = document.getElementById("saveEditBtn");

  // Add Modal Elements
  const addModal = document.getElementById("addModal");
  const addForm = document.getElementById("addForm");
  const addName = document.getElementById("addName");
  const addCollege = document.getElementById("addCollege");
  const addPhone = document.getElementById("addPhone");
  const addGmail = document.getElementById("addGmail");
  const closeAddModalBtn = document.getElementById("closeAddModalBtn");
  const cancelAddBtn = document.getElementById("cancelAddBtn");
  const submitAddBtn = document.getElementById("submitAddBtn");

  // Delete Modal Elements
  const deleteModal = document.getElementById("deleteModal");
  const deleteRowId = document.getElementById("deleteRowId");
  const deleteParticipantName = document.getElementById("deleteParticipantName");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  // Toast Notification
  const toastNotification = document.getElementById("toastNotification");
  const toastText = document.getElementById("toastText");
  const toastIcon = document.getElementById("toastIcon");

  /* ================= AUTHENTICATION ================= */
  function checkAuth() {
    const isAuthed = sessionStorage.getItem("sec_admin_authed");
    if (isAuthed === "true") {
      loginScreen.style.display = "none";
      dashboardScreen.style.display = "flex";
      fetchParticipants();
    } else {
      loginScreen.style.display = "flex";
      dashboardScreen.style.display = "none";
    }
  }

  adminLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = adminPasscodeInput.value.trim();
    if (entered === ADMIN_PASSCODE) {
      sessionStorage.setItem("sec_admin_authed", "true");
      loginError.style.display = "none";
      adminPasscodeInput.value = "";
      checkAuth();
    } else {
      loginError.style.display = "block";
      adminPasscodeInput.select();
    }
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("sec_admin_authed");
    checkAuth();
  });

  /* ================= DATA FETCHING (FETCH + JSONP FALLBACK) ================= */
  function loadJsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = "sec_jsonp_" + Math.round(100000 * Math.random());
      const script = document.createElement("script");
      const separator = url.indexOf("?") >= 0 ? "&" : "?";
      
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("JSONP request timed out"));
      }, 12000);

      function cleanup() {
        if (window[callbackName]) delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        clearTimeout(timeoutId);
      }

      window[callbackName] = function(data) {
        cleanup();
        resolve(data);
      };

      script.src = `${url}${separator}callback=${callbackName}&t=${new Date().getTime()}`;
      script.onerror = function() {
        cleanup();
        reject(new Error("JSONP script load error"));
      };

      document.body.appendChild(script);
    });
  }

  async function fetchParticipants() {
    showTableState("loading");
    statStatus.textContent = "Syncing...";
    statStatus.className = "stat-value";

    let fetchedSuccessfully = false;

    // 1. Try standard fetch first
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?t=${new Date().getTime()}`, {
        method: "GET",
        redirect: "follow"
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.status === "success" && Array.isArray(result.data)) {
          participantsData = result.data;
          statStatus.textContent = "Connected";
          statStatus.className = "stat-value text-success";
          fetchedSuccessfully = true;
        }
      }
    } catch (fetchErr) {
      console.warn("Direct fetch failed, attempting JSONP fallback...", fetchErr);
    }

    // 2. If direct fetch fails (e.g. CORS block), use JSONP fallback
    if (!fetchedSuccessfully) {
      try {
        const result = await loadJsonp(GOOGLE_SCRIPT_URL);
        if (result && result.status === "success" && Array.isArray(result.data)) {
          participantsData = result.data;
          statStatus.textContent = "Connected";
          statStatus.className = "stat-value text-success";
          fetchedSuccessfully = true;
        } else {
          throw new Error(result?.message || "Invalid data format");
        }
      } catch (jsonpErr) {
        console.error("All fetch attempts failed:", jsonpErr);
        statStatus.textContent = "Connection Error";
        statStatus.className = "stat-value text-danger";
        showToast("error", "Could not fetch Google Sheet data. Please check Web App deployment.");
      }
    }

    filterAndRenderTable();
  }

  /* ================= RENDER & STATS ================= */
  function updateStats() {
    statTotalCount.textContent = participantsData.length;
    
    // Calculate unique colleges count
    const uniqueColleges = new Set(
      participantsData
        .map((p) => p.college_name.trim().toLowerCase())
        .filter((c) => c !== "")
    );
    statCollegesCount.textContent = uniqueColleges.size;
  }

  function filterAndRenderTable() {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      filteredData = [...participantsData];
    } else {
      filteredData = participantsData.filter((item) => {
        return (
          (item.name && item.name.toLowerCase().includes(query)) ||
          (item.college_name && item.college_name.toLowerCase().includes(query)) ||
          (item.phone_no && item.phone_no.toLowerCase().includes(query)) ||
          (item.gmail && item.gmail.toLowerCase().includes(query))
        );
      });
    }

    updateStats();
    renderTable();
  }

  function renderTable() {
    tableBody.innerHTML = "";

    if (filteredData.length === 0) {
      showTableState(participantsData.length === 0 ? "empty" : "no-match");
      showingCountText.textContent = `Showing 0 of ${participantsData.length} entries`;
      return;
    }

    showTableState("data");
    showingCountText.textContent = `Showing ${filteredData.length} of ${participantsData.length} entries`;

    filteredData.forEach((item, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td style="color: var(--text-muted); font-weight: 600;">${index + 1}</td>
        <td><strong style="color: var(--primary-navy);">${escapeHtml(item.name)}</strong></td>
        <td><span class="badge-college">${escapeHtml(item.college_name)}</span></td>
        <td>${escapeHtml(item.phone_no)}</td>
        <td><a href="mailto:${encodeURIComponent(item.gmail)}" style="color: var(--accent-blue); text-decoration: none;">${escapeHtml(item.gmail)}</a></td>
        <td style="text-align: center;">
          <div class="row-actions">
            <button class="btn-icon btn-icon-edit" data-row-id="${item.rowId}" title="Edit / Alter Details">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button class="btn-icon btn-icon-delete" data-row-id="${item.rowId}" title="Delete Participant">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </td>
      `;

      tableBody.appendChild(tr);
    });

    // Attach row action listeners
    document.querySelectorAll(".btn-icon-edit").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(btn.dataset.rowId));
    });

    document.querySelectorAll(".btn-icon-delete").forEach((btn) => {
      btn.addEventListener("click", () => openDeleteModal(btn.dataset.rowId));
    });
  }

  function showTableState(state) {
    if (state === "loading") {
      tableLoading.style.display = "flex";
      tableEmpty.style.display = "none";
      tableBody.style.display = "none";
    } else if (state === "empty" || state === "no-match") {
      tableLoading.style.display = "none";
      tableEmpty.style.display = "flex";
      tableBody.style.display = "none";
      if (state === "no-match") {
        tableEmpty.querySelector(".state-title").textContent = "No matching participants found";
        tableEmpty.querySelector(".state-sub").textContent = "Try adjusting your search query.";
      } else {
        tableEmpty.querySelector(".state-title").textContent = "No participants yet";
        tableEmpty.querySelector(".state-sub").textContent = "Registrations will appear here once submitted.";
      }
    } else {
      tableLoading.style.display = "none";
      tableEmpty.style.display = "none";
      tableBody.style.display = "";
    }
  }

  /* ================= SEARCH & TOOLBAR ================= */
  searchInput.addEventListener("input", filterAndRenderTable);
  refreshBtn.addEventListener("click", () => {
    fetchParticipants();
    showToast("success", "Refreshing data from Google Sheet...");
  });

  /* ================= EDIT / ALTER DETAILS ================= */
  function openEditModal(rowId) {
    const item = participantsData.find((p) => String(p.rowId) === String(rowId));
    if (!item) return;

    editRowId.value = item.rowId;
    editName.value = item.name;
    editCollege.value = item.college_name;
    editPhone.value = item.phone_no;
    editGmail.value = item.gmail;

    editModal.style.display = "flex";
    editName.focus();
  }

  function closeEditModal() {
    editModal.style.display = "none";
    editForm.reset();
  }

  closeEditModalBtn.addEventListener("click", closeEditModal);
  cancelEditBtn.addEventListener("click", closeEditModal);

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rowId = editRowId.value;
    const name = editName.value.trim();
    const college_name = editCollege.value.trim();
    const phone_no = editPhone.value.trim();
    const gmail = editGmail.value.trim();

    if (!name || !college_name || !phone_no || !gmail) {
      alert("Please fill in all required fields.");
      return;
    }

    const payload = {
      action: "update",
      rowId: rowId,
      name: name,
      college_name: college_name,
      phone_no: phone_no,
      gmail: gmail
    };

    saveEditBtn.disabled = true;
    saveEditBtn.classList.add("loading");
    saveEditBtn.querySelector(".btn-text").textContent = "Saving...";

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      // Update in local data
      const targetIndex = participantsData.findIndex((p) => String(p.rowId) === String(rowId));
      if (targetIndex !== -1) {
        participantsData[targetIndex] = {
          rowId: rowId,
          name: name,
          college_name: college_name,
          phone_no: phone_no,
          gmail: gmail
        };
      }

      closeEditModal();
      filterAndRenderTable();
      showToast("success", "Participant details updated successfully!");
    } catch (err) {
      console.error("Update error:", err);
      showToast("error", "Failed to update details. Please try again.");
    } finally {
      saveEditBtn.disabled = false;
      saveEditBtn.classList.remove("loading");
      saveEditBtn.querySelector(".btn-text").textContent = "Save Changes";
    }
  });

  /* ================= ADD PARTICIPANT ================= */
  openAddModalBtn.addEventListener("click", () => {
    addModal.style.display = "flex";
    addName.focus();
  });

  function closeAddModal() {
    addModal.style.display = "none";
    addForm.reset();
  }

  closeAddModalBtn.addEventListener("click", closeAddModal);
  cancelAddBtn.addEventListener("click", closeAddModal);

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = addName.value.trim();
    const college_name = addCollege.value.trim();
    const phone_no = addPhone.value.trim();
    const gmail = addGmail.value.trim();

    if (!name || !college_name || !phone_no || !gmail) {
      alert("Please fill in all required fields.");
      return;
    }

    const payload = {
      action: "create",
      name: name,
      college_name: college_name,
      phone_no: phone_no,
      gmail: gmail
    };

    submitAddBtn.disabled = true;
    submitAddBtn.classList.add("loading");
    submitAddBtn.querySelector(".btn-text").textContent = "Adding...";

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      // Optimistically append to local list
      participantsData.push({
        rowId: participantsData.length + 2,
        name: name,
        college_name: college_name,
        phone_no: phone_no,
        gmail: gmail
      });

      closeAddModal();
      filterAndRenderTable();
      showToast("success", "New participant added successfully!");
    } catch (err) {
      console.error("Add error:", err);
      showToast("error", "Failed to add participant.");
    } finally {
      submitAddBtn.disabled = false;
      submitAddBtn.classList.remove("loading");
      submitAddBtn.querySelector(".btn-text").textContent = "Add Participant";
    }
  });

  /* ================= DELETE PARTICIPANT ================= */
  function openDeleteModal(rowId) {
    const item = participantsData.find((p) => String(p.rowId) === String(rowId));
    if (!item) return;

    deleteRowId.value = item.rowId;
    deleteParticipantName.textContent = `"${item.name}"`;
    deleteModal.style.display = "flex";
  }

  function closeDeleteModal() {
    deleteModal.style.display = "none";
  }

  cancelDeleteBtn.addEventListener("click", closeDeleteModal);

  confirmDeleteBtn.addEventListener("click", async () => {
    const rowId = deleteRowId.value;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.classList.add("loading");
    confirmDeleteBtn.querySelector(".btn-text").textContent = "Deleting...";

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "delete", rowId: rowId })
      });

      // Remove from local list
      participantsData = participantsData.filter((p) => String(p.rowId) !== String(rowId));
      closeDeleteModal();
      filterAndRenderTable();
      showToast("success", "Participant deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("error", "Failed to delete participant.");
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.classList.remove("loading");
      confirmDeleteBtn.querySelector(".btn-text").textContent = "Delete";
    }
  });

  /* ================= EXPORT TO CSV ================= */
  exportCsvBtn.addEventListener("click", () => {
    if (participantsData.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = ["Name", "College Name", "Phone No", "Gmail"];
    const rows = participantsData.map((p) => [
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.college_name || "").replace(/"/g, '""')}"`,
      `"${(p.phone_no || "").replace(/"/g, '""')}"`,
      `"${(p.gmail || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sengunthar_Quiz_Participants_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("success", "CSV file exported successfully!");
  });

  /* ================= UTILITY FUNCTIONS ================= */
  function showToast(type, text) {
    toastText.textContent = text;
    toastNotification.className = `toast ${type}`;
    toastNotification.style.display = "flex";

    if (type === "success") {
      toastIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    } else {
      toastIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    }

    setTimeout(() => {
      toastNotification.style.display = "none";
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Phone input mask inside modal
  [editPhone, addPhone].forEach((input) => {
    input.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    });
  });

  // Initialize
  checkAuth();
});
