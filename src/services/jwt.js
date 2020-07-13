'use strict'

var jwt = require("jwt-simple")
var moment = require("moment")
var secret = 'password'

exports.createToken = function (user){
    var payload = {
        sub: user._id,
        usuario: user.user_name,
        tweets: user.tweets,
        followers: user.followers,
        following: user.following,
        iat: moment().unix(),
        exp: moment().day(30, 'days').unix()
    }

    return jwt.encode(payload, secret)
}