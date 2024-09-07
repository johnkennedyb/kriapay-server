const jwt = require('jsonwebtoken');
const {User} = require('../models/user');
const { transporter } = require('../mail/mail');


const appUserCheck = async function(req, res, next) {
  if (!req.header('Authorization')) {
    return res.status(401).json({ autherror: 'Unauthorized. Please try to login again' });
  }
    const token = req.header('Authorization').replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ autherror: 'Unauthorized. Please try to login again' });
  }

  jwt.verify(token, process.env.TWJ, async (err, decoded) => {
    if (err) {
        console.log(err)
      return res.status(401).json({ autherror: 'Invalid token. Please try to login again' });
    }

    let user = await User.findById(decoded.id, {'password' : 0});
            if (user) {
                req.user = decoded;
                req.userId = decoded.id;
                req.email = user.email;
                next();
            } else {
                console.log('there is an error')
                res.status(403).json({ autherror: 'User not found. Try to log in again' });
            }
    
  });
}

const isAdmin = async function(req, res, next) {
  const token = req.cookies.kriapaytoken;
if (token) {
  jwt.verify(token, process.env.TWJ , async function(err, decodedToken) {
      if (err) {
          res.status(403).redirect('/');
      } else {
          let user = await User.findById(decodedToken.id, {'password' : 0});
          if (user) {
              if (user.role === "admin") {
                req.user = user
                  next();
              } else {
                  res.status(500).redirect('/');
              } 
          } else {
              res.status(403).redirect('/');
          }
                 
      }
  })
} else {
  res.locals.currentAdmin = null;
  res.status(403).redirect('/');
}
}

/*
const tierCheck = async function(req, res, next) {
    const userId = req.userId;
    const user = await User.findById(userId)
    if (!user) {
      return res.status(500).json({error:"There ahs been an error. Kindly log in again"})
    }

    if (user.tier === 0) {
      return res.status(400).json({error:"You are on tier 0. Kindly upgrade before trying again."})
    }
    next()
}
    */

module.exports = { appUserCheck, isAdmin};