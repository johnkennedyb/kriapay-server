const mongoose = require('mongoose');
const { isEmail } = require('validator');
require('dotenv').config();
//const { genSalt, hash, compare } = require('bcryptjs');
const bcrypt = require('bcryptjs');
const ejs = require('ejs');
const { UserBankDetails } = require('./userbankdetails');
 

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        text: true
    },
    middleName: {
        type: String,
    },
    lastName: {
        type: String,
        required: true,
        text: true
    },
    email: {
        type: String,
        unique: true,
        index: true,
        required: true,
        lowercase: true,
        validate: isEmail,
        text: true,
    },
    subsEmail: {
        type: String,
        lowercase: true,
        default: ""
    },
    password: {
        type: String,
        minlength: 7
    },
    pin: {
        type: String,
    },
    emailToken: {
        type: String,
    },
    passwordToken: {
        type: String,
        default: "",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    phoneNumber: {
        type: String,
        required: true,
        minlength: 10,  
    },
    role: {
        type: String,
        default: "customer",
    },
    profilePic: {
        type: String,
        default: ""
    },
    otp: {
        type: String,
        default: "",
        maxlength: 6,
    },
    loginAttempts: {
        type: Number,
        default: 0,
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    dateOfBirth: {
        type: Date
    },
    countryOfResidence:{
        type:String
    },
    usdWalletBalance:{
        type: mongoose.Types.Decimal128,
        default: 0
    },
    sleWalletBalance:{
        type: mongoose.Types.Decimal128,
        default: 0
    },
    ngnWalletBalance:{
        type: mongoose.Types.Decimal128,
        default: 0
    },
    tier: {
        type: Number,
        default: 0
    },
    defaultCurrency: {
        type:String, enum:["usd","ngn","sle"],required:true
    } ,
    useBiometricsForTrans: {
        type: Boolean,
        default: false
    },
    referralID: {
        type: String,
        default: "",
        maxlength: 10,
    },
    referrer: {
        type: String,
        maxlength: 10,
        default: ""
    },
    referrees: {
        type: Array,
        default: [],
    },
})
userSchema.set('timestamps', true);


userSchema.pre('save', async function(next) {
    //allows the password to remain unchaged after every use of 'save'
    /*
    if(!this.isModified('password') && !this.isModified('pin')){
        return next();
    }
    const salt = await genSalt();

    this.password = await hash(this.password, salt);
    //this.emailToken = await crypto.randomBytes(64).toString('hex');
    next();
    */

    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt();
        this.password = await bcrypt.hash(this.password, salt);
        //this.emailToken = await crypto.randomBytes(64).toString('hex');
        next();
    } else if (this.isModified('pin')) {
        const salt = await bcrypt.genSalt();
        this.pin = await bcrypt.hash(this.pin, salt);
        //this.emailToken = await crypto.randomBytes(64).toString('hex');
        next();
    } else {
        return next();
    }
})

    //static method to log in user
    userSchema.statics.login = async function(email, password) {
        const user = await this.findOne({email})
        if (user) {
            const auth = await bcrypt.compare(password, user.password);
            if (auth) {
                user.loginAttempts = 0;
                await user.save();
                return user;
            } else {
                if (user.isLocked) {
                    throw Error("Account Locked");
                } else if (user.loginAttempts < 5) {
                    user.loginAttempts = user.loginAttempts + 1;
                    await user.save();
                    throw Error("Incorrect Email/Password")
                } else if (user.loginAttempts === 5) {
                    user.loginAttempts = 0;
                user.isLocked = true;
    
                //generate random alphanumeric string
                function randomString(length, chars) {
                    var result = '';
                    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
                    return result;
                }
                let emailToken = randomString(64, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
                user.emailToken = emailToken;
    
                
    
                //send user mail
                const sendMail = async function() {
                    //send transaction mail to user
                    const templatepath = path.join(__dirname, "../mailtemplates/suspiciousMail.ejs");
                    const mailData = await ejs.renderFile(templatepath, {user});
    
                    let mailOptions = {
                        from: {
                            name: 'Kriapay',
                            address: process.env.MAIL_USER
                        },
                        to: user.email,
                        subject: "Suspicious Activity on your account",
                        html: mailData
                    
                    }
                    
                    transporter.sendMail(mailOptions, function(err, success) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("sent")
                        }
                    });
                }
                sendMail();
    
                await user.save();
    
                throw Error("Account Locked");
                } 
            }
        
        
        
        } else {
            throw Error("Incorrect Email/Password")
        }
    }



userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phoneNumber: 1 }, { unique: true });
const User = mongoose.model('user', userSchema) ;

module.exports = {
    User
};
