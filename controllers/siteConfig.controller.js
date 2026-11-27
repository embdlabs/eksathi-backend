const fs = require("fs");
const path = require("path");

const NAV_FILE = path.join(__dirname, "..", "config", "nav-menu.json");
const ADMIN_MENU_FILE = path.join(__dirname, "..", "config", "admin-menu.json");

const DEFAULT_NAV = {
  experts: true,
  wall: true,
  blogs: true,
  institutes: true,
  jobs: true,
};

const DEFAULT_ADMIN_MENU = {
  dashboard: true,
  notifications: true,
  institutes: true,
  users: true,
  jobs: true,
  reports: true,
  siteMenus: false,
};

function normalizeNav(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    experts: src.experts !== false,
    wall: src.wall !== false,
    blogs: src.blogs !== false,
    institutes: src.institutes !== false,
    jobs: src.jobs !== false,
  };
}

function normalizeAdminMenu(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    dashboard: src.dashboard !== false,
    notifications: src.notifications !== false,
    institutes: src.institutes !== false,
    users: src.users !== false,
    jobs: src.jobs !== false,
    reports: src.reports !== false,
    siteMenus: src.siteMenus === true,
  };
}

function readJsonFile(filePath, defaults, normalize) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), "utf8");
      return { ...defaults };
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return normalize(parsed);
  } catch (err) {
    console.error(`[site-config] read ${path.basename(filePath)}:`, err.message);
    return { ...defaults };
  }
}

function writeJsonFile(filePath, next, normalize) {
  const normalized = normalize(next);
  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

function readNavMenu() {
  return readJsonFile(NAV_FILE, DEFAULT_NAV, normalizeNav);
}

function writeNavMenu(next) {
  return writeJsonFile(NAV_FILE, next, normalizeNav);
}

function readAdminMenu() {
  return readJsonFile(ADMIN_MENU_FILE, DEFAULT_ADMIN_MENU, normalizeAdminMenu);
}

function writeAdminMenu(next) {
  return writeJsonFile(ADMIN_MENU_FILE, next, normalizeAdminMenu);
}

function isSuperAdmin(req) {
  return String(req.user?.role || "").toLowerCase() === "superadmin";
}

/** Public — used by navbar / mobile footer */
const getNavMenu = (req, res) => {
  try {
    return res.json({ success: true, menu: readNavMenu() });
  } catch (err) {
    console.error("getNavMenu:", err);
    return res.status(500).json({ error: "Failed to load menu config" });
  }
};

/** Admin/SuperAdmin — update public navbar toggles (superadmin always; admin if allowed) */
const updateNavMenu = (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      const allowed = readAdminMenu();
      if (!allowed.siteMenus) {
        return res.status(403).json({
          error: "Only SuperAdmin can update site menus, or enable Site menus for Admin first.",
        });
      }
    }
    const body = req.body?.menu || req.body || {};
    const saved = writeNavMenu(body);
    return res.json({
      success: true,
      message: "Menu visibility updated",
      menu: saved,
    });
  } catch (err) {
    console.error("updateNavMenu:", err);
    return res.status(500).json({ error: "Failed to save menu config" });
  }
};

/** Admin/SuperAdmin — which Admin sidebar items are visible to role=admin */
const getAdminMenu = (req, res) => {
  try {
    return res.json({ success: true, menu: readAdminMenu() });
  } catch (err) {
    console.error("getAdminMenu:", err);
    return res.status(500).json({ error: "Failed to load admin menu config" });
  }
};

/** SuperAdmin only — decide Admin sidebar options */
const updateAdminMenu = (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        error: "Only SuperAdmin can change Admin panel menus.",
      });
    }
    const body = req.body?.menu || req.body || {};
    const saved = writeAdminMenu(body);
    return res.json({
      success: true,
      message: "Admin menu visibility updated",
      menu: saved,
    });
  } catch (err) {
    console.error("updateAdminMenu:", err);
    return res.status(500).json({ error: "Failed to save admin menu config" });
  }
};

module.exports = {
  getNavMenu,
  updateNavMenu,
  getAdminMenu,
  updateAdminMenu,
  readNavMenu,
  readAdminMenu,
  DEFAULT_NAV,
  DEFAULT_ADMIN_MENU,
};
