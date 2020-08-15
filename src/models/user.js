'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = Schema({
    user_name: {type: String, require: true},
    password: {type: String, require: true},
    tweets:[{
        tweet: String,
        retweet: {type:Schema.Types.ObjectId, ref: "tweets"},
        likes:[{ 
            type: Schema.Types.ObjectId, ref: "user" 
        }],
        replies:[{
            user: String,
            reply: String
        }],

        retweets:[{
            type: Schema.Types.ObjectId, ref: "user"
        }],
    }],
    following:[{
        user_name: String,
    }],
    followers:[{
        user_name: String,
    }]
});

module.exports = mongoose.model('user', schema)

