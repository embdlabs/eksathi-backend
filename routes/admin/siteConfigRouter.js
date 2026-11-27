const SiteConfigAdminRouter = require("express").Router();
const {
  getNavMenu,
  updateNavMenu,
  getAdminMenu,
  updateAdminMenu,
} = require("../../controllers/siteConfig.controller");

SiteConfigAdminRouter.get("/nav", getNavMenu);
SiteConfigAdminRouter.put("/nav", updateNavMenu);
SiteConfigAdminRouter.get("/admin-menus", getAdminMenu);
SiteConfigAdminRouter.put("/admin-menus", updateAdminMenu);

module.exports = SiteConfigAdminRouter;
