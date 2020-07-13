"use strict";

const jwt = require("jwt-simple");
const moment = require("moment");

const secret = "password";

exports.ensureAuth = function (req, res, next) {
  var x = req.body.command;
  var y = x.split(" ");
  var command = y[0] != null && y.length > 0 ? y[0] : "";

  if (!req.headers.authorization) {
    if (command === "REGISTER") {
      console.log("user sign up");
      next();
    } else if (command === "LOGIN") {
      console.log("user is loggin in");
      next();
    } else {
      return res
        .status(403)
        .send({ message: "authentication header is not there" });
    }
  } else {
    var token = req.headers.authorization.replace(/['"]+/g, "");
    try {
      var payload = jwt.decode(token, secret);
      if (payload.exp <= moment.unix) {
        return res.status(401).send({ message: "token expired" });
      }
    } catch (ex) {
      return res.status(404).send({ message: "invalid token" });
    }

    req.user = payload;
    next();
  }
};