'use strict'

const express = require("express")
const app = express();
const bodyParser = require("body-parser")

var general_routes = require ("./routes/routes")



app.use(bodyParser.urlencoded({ extended: false}))
app.use(bodyParser.json())


app.use((req, res, next)=>{
    res.header('Access-Control-allow-origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-with, Conten-Type, Accept, Access-Control-Allow-Request-Method')
    res.header('Access-Control-Allow-Methods, GET, POST, OPTIONS, PUT, DELETE')
    res.header('Allow, GET, POST, OPTIONS, PUT, DELETE')
    next();
})

app.use('/api', general_routes)


module.exports = app;