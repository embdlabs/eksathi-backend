const SiteConfigRouter = require("express").Router();
const { getNavMenu } = require("../controllers/siteConfig.controller");

SiteConfigRouter.get("/nav", getNavMenu);

module.exports = SiteConfigRouter;
