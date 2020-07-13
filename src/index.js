'use strict'

const mongoose = require("mongoose")
const app = require("./app")

mongoose.Promise = global.Promise;

mongoose.connect('mongodb://localhost:27017/twitter-db', { useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
    console.log('database access granted');

    app.set('port', process.env.PORT || 3000) 
    app.listen(app.get('port'), ()=>{
        console.log(`server running on port: ${app.get('port')}`);
    })

}).catch(err => console.log(err))