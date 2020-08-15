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
const { send } = require("process");
const { relativeTimeRounding } = require("moment");
const { countReset } = require("console");

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

                //console.log(y[1]);
                
              User.findOne({ user_name: y[1] },(err,loginUs)=>{
                  //console.log(loginUs);
                  
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

              //console.log(idUser);

              if(!idUser){
                  return res.status(403).send({message: 'you cant post on an account that it isnt yours'});
              }

              User.findByIdAndUpdate(idUser,{$push:{tweets:{tweet:result}}},
              {new:true},(err,newData)=>{
                  console.log(result);
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
                  //console.log(newData);
                  
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
                    if(n){

                        User.aggregate([ {$project: {_id: 1, count: {$size: '$likes'}}}], (err, num) => {
                            if(err) return res.status(500).send({message: 'petition error' })
                            return res.status(404).send({num})
                        })
                    }

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
            
                    //console.log(aqUsr);
                    
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

            case "LIKE_TWEET":

                var idUser = req.user.sub
                var idTweet = y[1]
                var bolo = false

                User.findOne({ $and: [{ "tweets._id": idTweet }, { "tweets.$.likes": idUser }] }, async(err, newData) => {
                    if(err) return res.status(500).send({message: 'petition error'})
                    if(newData) { 
                        return res.status(404).send({message:'liked'})
                    }else{
                        await User.findOne({tweets:{$elemMatch:{_id:idTweet}}},{"tweets.$":1},(err,foundLike)=>{
                            console.log(foundLike);

                            for (let i = 0; i < foundLike.tweets[0].likes.length; i++) {

                                if (foundLike.tweets[0].likes[i].equals(idUser) ) {
                                    bolo=true
                                    }
                                }

                                if(bolo === true){

                                    User.findOneAndUpdate({"tweets._id": idTweet }, {$pull: { "tweets.$.likes": idUser }}, {new: true}, (err, likedTweet) => {
                                        
                                        return res.status(200).send({message: 'like removed'})
                                            
                                        })
                                
                                    //return res.status(200).send({message: ' tweet has already been liked '})
        
                                }else{
        
                                    User.findOneAndUpdate({"tweets._id": idTweet }, {$push: { "tweets.$.likes": idUser }}, {new: true}, (err, likedTweet) => {
                                        
                                        return res.status(200).send({likedTweet})
                                        
                                            /*User.findOne({"tweets._id": idTweet }), (err, lt) => {
                                                return res.status(200).send({lt})
                                                }*/
                                            
                                        })
                                }

                        })
                        
                        }
                    })                

            break;

            case 'REPLY_TWEET':

                var idUser = req.user.usuario
                var idUser1 = req.user.sub
                var idTweet = y[1]
                var params = req.body.command; 
                var space = params.split(' ');
                space.splice(0,2)
                var result = space.join(' ')

                var space1 = params.split(' ');
                space1.splice(0,2)
                var result1 = space1.join(' ')


                User.findOne({"tweets._id": idTweet}, async(err, newData) => {
                    if(err) return res.status(500).send({message: 'petition error' })
                    if(!newData) return res.status(404).send({message: 'tweet was probably deleted' })
                    if(newData){

                        //agregar reply a el feed para que tenga una relacion con el tweet original WIP
                        /*User.findByIdAndUpdate(idUser1,{$push:{tweets:{tweet:result1}}}, {new:true},(err,newData)=>{
                            
                            if(err)return res.status(500).send({message: 'there was a request error' })
                            if(!newData)return res.status(404).send({message:'we couldnt add the reply to your profile'})
                        })*/

                        User.findOneAndUpdate({"tweets._id": idTweet }, {$push: { "tweets.$.replies": {user: idUser, reply: result} }}, {new: true}, (err, newReply) => {
                            if(err) return res.status(500).send({message: 'petition error' })
                            if(!newReply) return res.status(404).send({message: 'we couldnt add your reply' })
                            return res.status(200).send({newReply})        
                        })

                    }
                })

            break;

            case 'RETWEET':


                var idUser = req.user.sub
                var idTweet = y[1]
                var bolo = false

                User.findOne({"tweets._id": idTweet}, {new: true}, (err, foundUser) => {

                    if(foundUser.id === idUser){

                        return res.status(200).send({message: 'you cant retweet your own tweet'});
                    }
                })

                User.findOne({ $and: [{ "tweets._id": idTweet }, { "tweets.$.retweets": idUser }] }, async(err, newData) => {
                    if(err) return res.status(500).send({message: 'petition error'})
                    if(newData) { 
                        return res.status(404).send({message:'retweeted'})
                    }else{
                        await User.findOne({tweets:{$elemMatch:{_id:idTweet}}},{"tweets.$":1},(err,foundRetweet)=>{

                            for (let i = 0; i < foundRetweet.tweets[0].retweets.length; i++) {

                                if (foundRetweet.tweets[0].retweets[i].equals(idUser) ) {
                                    bolo=true
                                    }
                                }

                                if(bolo === true){

                                    User.findOneAndUpdate({"tweets._id": idTweet }, {$pull: { "tweets.$.retweets": idUser }}, {new: true}, (err, retweetRemoved) => {

                                        if(err) return res.status(500).send({message: 'petition error ' })
                                        if(retweetRemoved){

                                            User.findByIdAndUpdate(idUser,{$pull: {tweets: {retweet: idTweet }}}, {new: true}, (err, newData) => {
                                                if(err) return res.status(500).send({message: 'petition error' })
                                                return res.status(200).send({message: 'retweet has been removed' })

                                            })
                                        }     
                                    })

                                }else{
        
                                    User.findOneAndUpdate({"tweets._id": idTweet }, {$push: { "tweets.$.retweets": idUser }}, {new: true}, (err, retweetAdded) => {
                                        if(err) return res.status(500).send({message: 'petition error ' })
                                        if(!retweetAdded) return res.status(404).send({message: ' there was an error ' })
                                        if(retweetAdded){

                                            User.findOne({ tweets: { $elemMatch: {_id: idTweet }}}, {"tweets.$":1}, (err,foundCollection) => {
                                                if(err) return res.status(500).send({message: 'petition error' })
                                                if(!foundCollection) return res.status(404).send({message: 'collection was not found' })
                                                if(foundCollection){

                                                    User.findByIdAndUpdate(idUser,{$push: {tweets: {retweet: idTweet }}}, {new: true}, (err, newData) => {
                                                        console.log(newData);
                                                        if(err)return res.status(500).send({message:'could not login'})
                                                        if(!newData)return res.status(404).send({message:'your tweet didnt tweet'})
                                                        if(newData){
                                                            User.findOne({ tweets: { $elemMatch: {retweet: idTweet }}}, {"tweets.$.retweet":1}, (err, newVar) => {
                                                                console.log(newVar);
                                                                console.log(err);
                                                                if(err) return res.status(500).send({message: 'petition error' })
                                                                if(newVar){
                                                                    User.find({tweets: {$elemMatch: {_id: idTweet }}}, {"tweets.$": 1}).populate({path: "retweet", populate: { path: "tweets.retweet" } }).exec(function(err, popo){

                                                                        console.log(err);
                                                                        return res.status(200).send({retweet: newVar, originalTweet: popo})

                                                                    }) 
                                                                        
                                                                }
                                                            })
                                                        }
                                                        
                                                    })                 
                                                }
                                            })
                                        }

                                    })
                                }
                        })
                        
                        }
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
