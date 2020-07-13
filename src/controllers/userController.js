'use strict'

//imports
var bcrypt = require("bcrypt-nodejs");
var User = require('../models/user');
const jwt = require('../services/jwt');
var path = require('path')
var fs = require('fs')
const { check } = require("../app");
const { use } = require("../routes/routes");
const { sep } = require("path");

async function commands(req, res) {
    try {
        var user = new User();
        var x = req.body.command;
        var y = x.split(' ');

        switch (y[0]) {
            case "REGISTER":

                if ( y[1] &&  y[2]) {
                    user.user_name =  y[1];
                    user.password =  y[2];

                    await User.find({$or: [{ usuario: user.user_name }]}, (error, users) => {
                        if(error) return res.status(400).send({ message: 'Bad Request' })
                        if(users && users.length >= 1) {
                            return res.status(500).send({ message: 'El usuario ya existe.' })
                        } else {
                            bcrypt.hash(y[2], null, null, (err, hash) =>{
                                user.password = hash;

                                user.save((error, userSave)=>{
                                    if(error) res.status(400).send({ message: 'Bad Request' });
                                    if(userSave) {
                                        res.status(201).send({ message: 'Success', usuario: userSave })
                                    } else {
                                        res.status(400).send({ message: 'Unexpected Error' })
                                    }
                                })  
                            })
                        }
                    })
                } else {
                    res.status(400).send({ message: 'Missing Data' });
                }
                break;

            case "LOGIN":

                console.log(y[1]);
                
              User.findOne({ user_name: y[1] },(err,loginUs)=>{
                  console.log(loginUs);
                  
                  if(err) return res.status(500).send({message:'petition error'})
                  if(loginUs){
                      bcrypt.compare(y[2], loginUs.password,(err,check)=>{
                          return res.status(200).send({
                              token:jwt.createToken(loginUs)
                          })
                      })
                  }else{

                      return res.status(404).send({message:'bad credentials'})
                  }
              })
                break;
                
                

            case "ADD_TWEET":

              
              var params = req.body.command; 
              var space = params.split(' ');
              space.splice(0,1)
              var result = space.join(' ')
              var idUser = req.user.sub

              console.log(idUser);

              if(!idUser){
                  return res.status(403).send({message: 'you cant post on an account that it isnt yours'});
              }

              User.findByIdAndUpdate(idUser,{$push:{tweets:{tweet:result}}},
              {new:true},(err,newData)=>{
                  console.log(newData);
                  if(err)return res.status(500).send({message:'could not login'})
                  if(!newData)return res.status(404).send({message:'your tweet didnt tweet'})
                  return res.status(200).send({newData})
              })

              break;

            case "EDIT_TWEET":

                var idTweet = y[1];
                var almc = y[0] + y[1];
                y.splice(almc, 2)
                var result = y.join(" ");
                var idUser = req.user.sub;

                User.findOneAndUpdate({_id: idUser, "tweets._id": idTweet}, {"tweets.$.tweet": result},   
                {new: true}, (err, newData) => {
                  if(err) return res.status(500).send({message: 'bad request'});
                  if(!newData) return res.status(404).send({message: 'couldnt post tweet'})
                  console.log(newData);
                  
                  return res.status(200).send({newData})
                });

            break;

            case "DELETE_TWEET":

                var idUser = req.user.sub;
                var params = req.body.command; 
                var y = params.split(' ');
                
                User.findByIdAndUpdate(idUser,{$pull:{tweets:{_id: y[1],}}},
                    {new:true},(err,newData)=>{
                        if(err)return res.status(500).send({message:'error on petition'})
                        if(!newData)return res.status(500).send({message:'couldnt delete the tweet'}) 
                        return res.status(200).send({newData})
                    })
            break;

            case "VIEW_TWEETS":

                var idUser = req.user.sub;
                var params = req.body.command;

                User.findOne({user_name: {$regex: y[1], $options: "i" }}, (err, n) =>{
                    if(!n) return res.status(404).send({message: 'petition error'})
                    if(err) return res.status(500).send({message: "error"})
                    if(n) return res.status(200).send({message: n.tweets})

                })

            break;

            case "FOLLOW":

                var userId = req.user.sub;
              
                User.findOne({user_name:{ $regex: y[1] }},(err,aqUsr) => {
              
                  if(y[1] === req.user.usuario){
                      return res.status(200).send({message: 'you cant follow yourself 🙄'})
                  }
                  User.findByIdAndUpdate(userId, { $push: {following: {_id: aqUsr._id, user_name: aqUsr.user_name,}}},
                      {new: true}, (err,newData) => { 
                          if(err) return res.status(500).send({message: 'petition error'})
                          if(!newData) return res.status(500).send({message: 'we couldnt follow the user'})
                          User.findByIdAndUpdate(aqUsr._id, { $push: {followers:{id: userId, user_name: newData.user_name}}},
                              {new:true},(err, details) => {
                                  return res.status(200).send({newData})
                              })
              
                      })
                })
                 
            break;

            //no funcio
            
            case "UNFOLLOW":

                var userId = req.user.sub;
                
                User.findOne({user_name: { $regex: y[1]}}, (err, aqUsr) => {
            
                    console.log(aqUsr);
                    
                  User.findByIdAndUpdate(userId, { $pull: { following: { user_name: aqUsr.user_name,}}},
                      {new: true}, (err,newData)=>{
                          if(err) return res.status(500).send({message:'petition error'})
                          if(!newData) return res.status(500).send({message:'couldnt unfollow the user'})
                          User.findByIdAndUpdate(aqUsr._id, { $pull: { followers: { user_name: newData.user_name}}},
                              {new:true},(err, details) => {
                                  return res.status(200).send({newData})
                              })
                      })
                })
              
            break;

            case "PROFILE":
                User.findOne({user_name:{$regex: y[1]}}, {"password":0,} , (err, aqUsr) => {
                    if(!aqUsr) return res.status(404).send({message: 'could not acces profile'})
                    if(err) return res.status(500).send({message: 'petition error'})
                    if(aqUsr) return res.status(200).send({tweets: aqUsr})
                })

            break;

            default:
                res.status(500).send({ message: 'invalid' });
                break;
        }
    
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: error.message });
        }
    }
    
    module.exports = {
        commands
    }
