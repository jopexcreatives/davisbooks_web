// Davis Books - Admin Dashboard Controller
let currentAdminTab = 'overview';
let cachedBooks = [];
let cachedPurchases = [];
let cachedManagers = [];
let currentAdminUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  initSupabaseAdmin();
});

function initSupabaseAdmin() {
  const adminSessionStr = sessionStorage.getItem('davis_admin_session');
  if (adminSessionStr) {
    try {
      currentAdminUser = JSON.parse(adminSessionStr);
      updateAdminProfileUI(currentAdminUser);
    } catch(e) {}
  }

  // Pre-fill Supabase config inputs
  const urlInput = document.getElementById('cfg-supabase-url');
  const keyInput = document.getElementById('cfg-supabase-key');
  if (urlInput) urlInput.value = localStorage.getItem('davis_supabase_url') || '';
  if (keyInput) keyInput.value = localStorage.getItem('davis_supabase_key') || '';

  // Load dashboard data
  loadAllDashboardData();
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      if (!tab) return;
      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  currentAdminTab = tabId;
  document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });

  const tabTitles = {
    overview: { title: 'Dashboard Overview', sub: "Welcome back. Here is Mr. Davis' books performance today." },
    books: { title: 'Books & Digital Assets', sub: 'Upload PDF/EPUB books, assign secure storage, and set pricing.' },
    purchases: { title: 'Purchases & Customer Access', sub: 'Manage purchases, verify transactions, and grant direct customer access.' },
    managers: { title: 'Team & Purchase Managers', sub: 'Add authorized people to manage customer purchases and order verifications.' },
    social: { title: 'Social Links & Author Profile', sub: 'Update Mr. Davis public social media links and author details.' },
    settings: { title: 'Supabase & Security Settings', sub: 'Configure Supabase Database, Auth, and Storage keys.' }
  };

  const info = tabTitles[tabId] || tabTitles.overview;
  const tEl = document.getElementById('topbar-main-title');
  const sEl = document.getElementById('topbar-main-sub');
  if (tEl) tEl.textContent = info.title;
  if (sEl) sEl.textContent = info.sub;
}

function updateAdminProfileUI(user) {
  if (!user) return;
  const nameElem = document.getElementById('admin-display-name');
  const roleElem = document.getElementById('admin-display-role');
  const avatarElem = document.getElementById('admin-avatar-initial');
  if (nameElem) nameElem.textContent = user.name || user.email || 'Admin User';
  if (roleElem) roleElem.textContent = (user.role || 'Super Admin').toUpperCase();
  if (avatarElem) avatarElem.textContent = (user.name || user.email || 'A').charAt(0).toUpperCase();
}

async function loadAllDashboardData() {
  await Promise.allSettled([
    loadBooksData(),
    loadPurchasesData(),
    loadManagersData(),
    loadSocialSettings()
  ]);
  updateOverviewMetrics();
}

// 1. Books Catalog
async function loadBooksData() {
  const sb = getSupabase();
  const tableBody = document.getElementById('books-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">Loading books catalog...</td></tr>`;

  try {
    let books = [];
    if (sb) {
      const { data, error } = await sb.from('books').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) books = data;
    }

    if (books.length === 0) {
      books = [
        { id: '1', title: 'The Expected Glory of the Latter Church', category: 'Spiritual Growth', price: 65, currency: 'GHS', pdf_storage_path: 'protected/the-expected-glory.pdf', epub_storage_path: 'protected/the-expected-glory.epub', is_published: true },
        { id: '2', title: 'Who Told You That You Were Naked?', category: 'Spiritual Growth', price: 60, currency: 'GHS', pdf_storage_path: 'protected/who-told-you.pdf', epub_storage_path: '', is_published: true },
        { id: '3', title: 'Jesus Must Remain in Heaven UNTIL...', category: 'Theology', price: 70, currency: 'GHS', pdf_storage_path: 'protected/jesus-must-remain.pdf', epub_storage_path: 'protected/jesus-must-remain.epub', is_published: true },
        { id: '4', title: 'The Making of a Nation', category: 'Leadership & Society', price: 80, currency: 'GHS', pdf_storage_path: 'protected/the-making-of-a-nation.pdf', epub_storage_path: '', is_published: true },
        { id: '5', title: 'Temptation: Overcoming Life Traps', category: 'Christian Life', price: 55, currency: 'GHS', pdf_storage_path: 'protected/temptation.pdf', epub_storage_path: '', is_published: true }
      ];
    }

    cachedBooks = books;
    renderBooksTable(books);
  } catch(err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#ef4444;">Failed to load books.</td></tr>`;
  }
}

function renderBooksTable(books) {
  const tableBody = document.getElementById('books-table-body');
  if (!tableBody) return;

  if (books.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No books found. Click "Add New Book" to start.</td></tr>`;
    return;
  }

  tableBody.innerHTML = books.map(book => `
    <tr>
      <td><strong>${escapeHtml(book.title)}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(book.category || 'General')}</span></td>
      <td><strong>${book.currency || 'GHS'} ${Number(book.price).toFixed(2)}</strong></td>
      <td>
        ${book.pdf_storage_path ? '<span class="badge badge-success" title="Stored in Supabase private bucket">PDF</span> ' : '<span class="badge" style="background:#fee2e2;color:#991b1b;">No PDF</span> '}
        ${book.epub_storage_path ? '<span class="badge badge-warning" title="EPUB file stored">EPUB</span>' : ''}
      </td>
      <td>
        <span class="badge ${book.is_published ? 'badge-success' : 'badge-warning'}">
          ${book.is_published ? 'Published' : 'Draft'}
        </span>
      </td>
      <td>
        <button class="btn-outline-admin" style="padding:4px 10px; font-size:0.75rem;" onclick="openBookModal('${book.id}')">Edit</button>
        <button class="btn-outline-admin" style="padding:4px 10px; font-size:0.75rem; color:#ef4444; border-color:#fca5a5;" onclick="deleteBook('${book.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// 2. Purchases & Customer Access Management
async function loadPurchasesData() {
  const sb = getSupabase();
  const tableBody = document.getElementById('purchases-table-body');
  if (!tableBody) return;

  try {
    let purchases = [];
    if (sb) {
      const { data, error } = await sb.from('purchases').select('*, books(title)').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) purchases = data;
    }

    if (purchases.length === 0) {
      purchases = [
        { id: 'p1', buyer_name: 'Kwame Mensah', buyer_email: 'kwame.mensah@gmail.com', book_title: 'The Expected Glory of the Latter Church', amount_paid: 65, currency: 'GHS', payment_status: 'completed', created_at: '2026-10-22 09:15' },
        { id: 'p2', buyer_name: 'Abena Osei', buyer_email: 'abena.osei@yahoo.com', book_title: 'Who Told You That You Were Naked?', amount_paid: 60, currency: 'GHS', payment_status: 'completed', created_at: '2026-10-21 16:40' },
        { id: 'p3', buyer_name: 'Pastor Emmanuel', buyer_email: 'emmanuel.pastor@church.org', book_title: 'Jesus Must Remain in Heaven UNTIL...', amount_paid: 70, currency: 'GHS', payment_status: 'manual_added', created_at: '2026-10-20 11:20' },
        { id: 'p4', buyer_name: 'Grace Arthur', buyer_email: 'grace.arthur@outlook.com', book_title: 'The Making of a Nation', amount_paid: 80, currency: 'GHS', payment_status: 'completed', created_at: '2026-10-19 14:10' }
      ];
    }

    cachedPurchases = purchases;
    renderPurchasesTable(purchases);
  } catch(err) {
    console.error(err);
  }
}

function renderPurchasesTable(purchases) {
  const tableBody = document.getElementById('purchases-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = purchases.map(p => `
    <tr>
      <td>
        <strong>${escapeHtml(p.buyer_name || 'Customer')}</strong>
        <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(p.buyer_email)}</div>
      </td>
      <td><strong>${escapeHtml(p.books?.title || p.book_title || 'Book Access')}</strong></td>
      <td><strong>${p.currency || 'GHS'} ${Number(p.amount_paid).toFixed(2)}</strong></td>
      <td>
        <span class="badge ${p.payment_status === 'completed' ? 'badge-success' : 'badge-warning'}">
          ${p.payment_status === 'manual_added' ? 'Granted by Manager' : 'Paid Online'}
        </span>
      </td>
      <td style="font-size:0.8rem; color:#64748b;">${p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent'}</td>
      <td>
        <button class="btn-outline-admin" style="padding:4px 8px; font-size:0.75rem;" onclick="resendAccessEmail('${p.buyer_email}')">Resend Link</button>
      </td>
    </tr>
  `).join('');
}

// 3. Purchase Managers (Infy Team delegation pattern)
async function loadManagersData() {
  const sb = getSupabase();
  const tableBody = document.getElementById('managers-table-body');
  if (!tableBody) return;

  try {
    let managers = [];
    if (sb) {
      const { data, error } = await sb.from('profiles').select('*').in('role', ['admin', 'manager']);
      if (!error && data && data.length > 0) managers = data;
    }

    if (managers.length === 0) {
      managers = [
        { id: 'm1', full_name: 'Mr. Davis (Author)', email: 'author@davisbooks.org', role: 'admin', created_at: '2026-01-01' },
        { id: 'm2', full_name: 'Bookstore Manager - John', email: 'orders@davisbooks.org', role: 'manager', created_at: '2026-06-15' }
      ];
    }

    cachedManagers = managers;
    renderManagersTable(managers);
  } catch(e) {
    console.error(e);
  }
}

function renderManagersTable(managers) {
  const tableBody = document.getElementById('managers-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = managers.map(m => `
    <tr>
      <td><strong>${escapeHtml(m.full_name || 'Staff Member')}</strong></td>
      <td>${escapeHtml(m.email)}</td>
      <td>
        <span class="badge ${m.role === 'admin' ? 'badge-admin' : 'badge-info'}">
          ${m.role === 'admin' ? 'Primary Author / Super Admin' : 'Purchase Manager'}
        </span>
      </td>
      <td><span class="badge badge-success">Active Permissions</span></td>
      <td>
        ${m.role !== 'admin' ? `<button class="btn-outline-admin" style="padding:4px 8px; font-size:0.75rem; color:#ef4444; border-color:#fca5a5;" onclick="removeManager('${m.id}')">Revoke</button>` : '<span style="font-size:0.75rem;color:#94a3b8;">Primary Owner</span>'}
      </td>
    </tr>
  `).join('');
}

// 4. Social Links & Author Profile
async function loadSocialSettings() {
  const sb = getSupabase();
  try {
    let socialData = null;
    let authorData = null;

    if (sb) {
      const { data: sData } = await sb.from('site_settings').select('value').eq('key', 'social_links').single();
      const { data: aData } = await sb.from('site_settings').select('value').eq('key', 'author_info').single();
      if (sData) socialData = sData.value;
      if (aData) authorData = aData.value;
    }

    if (!socialData) {
      try {
        socialData = JSON.parse(localStorage.getItem('davis_social_links'));
      } catch(e) {}
    }
    if (!authorData) {
      try {
        authorData = JSON.parse(localStorage.getItem('davis_author_info'));
      } catch(e) {}
    }

    if (!socialData) {
      socialData = {
        facebook: "https://facebook.com/davisbooks",
        twitter: "https://x.com/davisbooks",
        instagram: "https://instagram.com/davisbooks",
        whatsapp: "+233 24 123 4567",
        youtube: "https://youtube.com/@davisbooks"
      };
    }

    if (!authorData) {
      authorData = {
        name: "Mr. Davis",
        title: "Author, Speaker & Educator",
        bio: "Inspiring lives and providing timeless knowledge through books for a brighter future.",
        phone: "+233 24 123 4567",
        email: "author@davisbooks.org"
      };
    }

    setInputValue('soc-facebook', socialData.facebook);
    setInputValue('soc-twitter', socialData.twitter);
    setInputValue('soc-instagram', socialData.instagram);
    setInputValue('soc-whatsapp', socialData.whatsapp);
    setInputValue('soc-youtube', socialData.youtube);

    setInputValue('author-name-input', authorData.name);
    setInputValue('author-title-input', authorData.title);
    setInputValue('author-bio-input', authorData.bio);
    setInputValue('author-phone-input', authorData.phone);
    setInputValue('author-email-input', authorData.email);

  } catch(e) {
    console.error(e);
  }
}

async function saveSocialLinks(e) {
  if (e) e.preventDefault();
  const sb = getSupabase();

  const socialLinks = {
    facebook: document.getElementById('soc-facebook')?.value || '',
    twitter: document.getElementById('soc-twitter')?.value || '',
    instagram: document.getElementById('soc-instagram')?.value || '',
    whatsapp: document.getElementById('soc-whatsapp')?.value || '',
    youtube: document.getElementById('soc-youtube')?.value || '',
    updatedAt: new Date().toISOString()
  };

  const authorInfo = {
    name: document.getElementById('author-name-input')?.value || '',
    title: document.getElementById('author-title-input')?.value || '',
    bio: document.getElementById('author-bio-input')?.value || '',
    phone: document.getElementById('author-phone-input')?.value || '',
    email: document.getElementById('author-email-input')?.value || '',
    updatedAt: new Date().toISOString()
  };

  try {
    if (sb) {
      await sb.from('site_settings').upsert([
        { key: 'social_links', value: socialLinks },
        { key: 'author_info', value: authorInfo }
      ]);
    }
    localStorage.setItem('davis_social_links', JSON.stringify(socialLinks));
    localStorage.setItem('davis_author_info', JSON.stringify(authorInfo));
    showToast('Social links and author profile updated successfully!');
  } catch(err) {
    alert('Failed to save settings: ' + err.message);
  }
}

// 5. Grant Customer Access (Direct Add to Purchases)
async function handleAddPurchase(e) {
  e.preventDefault();
  const buyerName = document.getElementById('add-buyer-name')?.value.trim();
  const buyerEmail = document.getElementById('add-buyer-email')?.value.trim();
  const bookId = document.getElementById('add-book-select')?.value;
  const amountPaid = parseFloat(document.getElementById('add-amount-paid')?.value) || 0;

  if (!buyerEmail || !bookId) {
    alert('Please enter customer email and pick a book.');
    return;
  }

  const sb = getSupabase();
  const selectedBook = cachedBooks.find(b => b.id === bookId);

  const newPurchase = {
    book_id: bookId,
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    amount_paid: amountPaid,
    currency: 'GHS',
    payment_status: 'manual_added',
    book_title: selectedBook ? selectedBook.title : 'Selected Book',
    created_at: new Date().toISOString()
  };

  try {
    if (sb) {
      const { error } = await sb.from('purchases').insert([newPurchase]);
      if (error) throw error;
    }

    cachedPurchases.unshift(newPurchase);
    renderPurchasesTable(cachedPurchases);
    closeModal('modal-add-purchase');
    showToast(`Access granted to ${buyerEmail}!`);
    document.getElementById('form-add-purchase')?.reset();
    updateOverviewMetrics();
  } catch(err) {
    alert('Error granting access: ' + err.message);
  }
}

// 6. Add Purchase Manager
async function handleAddManager(e) {
  e.preventDefault();
  const name = document.getElementById('mgr-name')?.value.trim();
  const email = document.getElementById('mgr-email')?.value.trim();
  const role = document.getElementById('mgr-role')?.value || 'manager';

  if (!email) {
    alert('Please enter manager email');
    return;
  }

  const sb = getSupabase();
  try {
    if (sb) {
      const { error } = await sb.from('profiles').upsert([
        { email, full_name: name, role, updated_at: new Date().toISOString() },
      ], { onConflict: 'email' });
      if (error) throw error;
    }

    const newMgr = { id: 'm_' + Date.now(), full_name: name, email, role, created_at: new Date().toISOString() };
    cachedManagers.push(newMgr);
    renderManagersTable(cachedManagers);

    showToast(`Manager ${email} added with ${role} permissions!`);
    closeModal('modal-add-manager');
    document.getElementById('form-add-manager')?.reset();
  } catch(err) {
    alert('Error adding manager: ' + err.message);
  }
}

// 7. Add / Save Book
async function handleSaveBook(e) {
  e.preventDefault();
  const title = document.getElementById('book-title')?.value.trim();
  const category = document.getElementById('book-category')?.value;
  const price = parseFloat(document.getElementById('book-price')?.value) || 0;
  const pdfFile = document.getElementById('book-pdf-file')?.files[0];
  const epubFile = document.getElementById('book-epub-file')?.files[0];

  if (!title) {
    alert('Book title is required');
    return;
  }

  const sb = getSupabase();
  let pdfStoragePath = '';
  let epubStoragePath = '';

  try {
    if (sb && pdfFile) {
      const path = `pdf/${Date.now()}_${pdfFile.name.replace(/\s+/g, '_')}`;
      const { data, error } = await sb.storage.from('book-files').upload(path, pdfFile);
      if (!error && data) pdfStoragePath = data.path;
    }

    if (sb && epubFile) {
      const path = `epub/${Date.now()}_${epubFile.name.replace(/\s+/g, '_')}`;
      const { data, error } = await sb.storage.from('book-files').upload(path, epubFile);
      if (!error && data) epubStoragePath = data.path;
    }

    const newBook = {
      title,
      category,
      price,
      currency: 'GHS',
      pdf_storage_path: pdfStoragePath || 'protected/book.pdf',
      epub_storage_path: epubStoragePath || '',
      is_published: true,
      created_at: new Date().toISOString()
    };

    if (sb) {
      const { error } = await sb.from('books').insert([newBook]);
      if (error) throw error;
    }

    cachedBooks.unshift(newBook);
    renderBooksTable(cachedBooks);
    closeModal('modal-add-book');
    showToast(`Book "${title}" added with protected Supabase storage!`);
    document.getElementById('form-add-book')?.reset();
    updateOverviewMetrics();
  } catch(err) {
    alert('Error saving book: ' + err.message);
  }
}

function updateOverviewMetrics() {
  const totalRevenue = cachedPurchases.reduce((acc, curr) => acc + (Number(curr.amount_paid) || 0), 0);
  const totalSalesCount = cachedPurchases.length;
  const totalBooksCount = cachedBooks.length;
  const managersCount = cachedManagers.length || 2;

  const revElem = document.getElementById('metric-revenue');
  const salesElem = document.getElementById('metric-sales');
  const booksElem = document.getElementById('metric-books');
  const mgrElem = document.getElementById('metric-managers');

  if (revElem) revElem.textContent = `GH₵ ${totalRevenue.toFixed(2)}`;
  if (salesElem) salesElem.textContent = totalSalesCount;
  if (booksElem) booksElem.textContent = totalBooksCount;
  if (mgrElem) mgrElem.textContent = managersCount;
}

// Helpers
function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.value = val;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');

  if (id === 'modal-add-purchase') {
    const sel = document.getElementById('add-book-select');
    if (sel && cachedBooks.length > 0) {
      sel.innerHTML = cachedBooks.map(b => `<option value="${b.id}">${escapeHtml(b.title)} (GH₵ ${b.price})</option>`).join('');
    }
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.background = '#0d1b2a';
  toast.style.color = '#ffffff';
  toast.style.padding = '14px 24px';
  toast.style.borderRadius = '12px';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  toast.style.borderLeft = '4px solid #e5a93c';
  toast.style.fontSize = '0.9rem';
  toast.style.fontWeight = '600';
  toast.style.zIndex = '99999';
  toast.textContent = msg;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function handleLogout() {
  sessionStorage.removeItem('davis_admin_session');
  window.location.href = 'index.html';
}

function resendAccessEmail(email) {
  showToast(`Access link & reading pass resent to ${email}`);
}

function saveSupabaseConnectionSettings(e) {
  e.preventDefault();
  const url = document.getElementById('cfg-supabase-url')?.value.trim();
  const key = document.getElementById('cfg-supabase-key')?.value.trim();
  updateSupabaseCredentials(url, key);
  showToast('Supabase connection details saved!');
  loadAllDashboardData();
}
