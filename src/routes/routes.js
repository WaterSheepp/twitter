'use strict'

var express = require("express")
var md_aut = require("../middleware/auth")
var generalController = require("../controllers/userController")

var api = express.Router()

api.post('/command', md_aut.ensureAuth, generalController.commands)

module.exports = api;