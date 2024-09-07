const { Router } = require("express");
const { Admin } = require("../models/admin");
const { User } = require("../models/user");
const { isAdmin } = require("../middleware/authMiddleware");
const { DepositMethod } = require("../models/depositMethod");
const { Rate } = require("../models/rate");
const { TransferLimit } = require("../models/transferLimit");
const { Tier } = require("../models/tier");
const { Transaction } = require("../models/transaction");
let { transporter } = require("../mail/mail");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ejs = require("ejs");
const mongoose = require("mongoose");

const router = Router();

//generate random alphanumeric string
function randomString(length, chars) {
  var result = "";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

const createToken = function (id) {
  return jwt.sign({ id }, process.env.TWJ, {
    //change figure
    expiresIn: "60m",
  });
};

//create 
router.post("/staffend/auth/signup", async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    phoneNumber,
    email,
    dateOfbirth,
    countryOfResidence,
  } = req.body;

  let emailToken = randomString(64, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  //let otp = randomString(6, "0123456789");
  let referralID =
    firstName.substring(0, 3) +
    randomString(
      7,
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    );
  try {
    //create admin in database
    const admin = await Admin.create({
      firstName,
      middleName,
      lastName,
      phoneNumber,
      email,
      dateOfbirth,
      countryOfResidence,
      referralID,
      emailToken
    });
    //send admin sign up mail
    const sendMail = async function () {
      const templatepath = path.join(
        __dirname,
        "../mailtemplates/admin/adminVerifyEmail.ejs"
      );
      const mailData = await ejs.renderFile(templatepath, { admin });
      let mailOptions = {
        //from: process.env.MAIL_USER,
        from: {
          name: "KriaPay",
          address: process.env.MAIL_USER,
        },
        to: admin.email,
        subject: "You have been invited to work with KriaPay!",
        html: mailData,
      };

      transporter.sendMail(mailOptions, function (err, success) {
        if (err) {
          console.log(err);
        } else {
          console.log("sent");
        }
      });
    };
    sendMail();

    res.status(201).json({ success: "Sign up successful" });
    return;
  } catch (err) {
    console.log(err);
    let errors = { email: "" };
    //duplicate error code
    if (err.code === 11000) {
      errors.email =
        "Sorry, either the email or phone number is already taken. Please try another.";
      res.status(400).json({ errors });
    }
  }
});


// router.get('/staffend/auth/verify-account/:emailToken', async(req,res)=> {
//   const emailToken = req.params.emailToken

//   try {
//     const admin = await Admin.findOne({emailToken});
//     if (!admin) {
//       return res.status(500).json({error:"Can't seem to find that invite. Please contact an admin"})
//     }
//     admin.emailToken = '';
//     admin.isVerified = true;
//     await admin.save();
  
//     return res.status(200).json({success:"Your account has been verified. You will be redirected to create a password.",email:admin.email})
  
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({error:"Server error"});
//   }
  
// })

router.post('/staffend/auth/create-password/:emailToken', async(req,res)=> {
  const emailToken = req.params.emailToken
  const { password} = req.body;

  try {
    const admin = await Admin.findOne({emailToken});
    if (!admin) {
      return res.status(404).json({error:"Can't seem to find that invite. Please contact an admin"})
    }
    admin.password = password;
    admin.emailToken = '';
    admin.isVerified = true;
    await admin.save();
    return res.status(200).json({success:"Password saved and email verified successfully. Kindly login"})

  } catch (err) {
    console.log(err);
    return res.status(500).json({error:"Server error"});
  }
  
})

//admin login before otp
router.post("/admin/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let error;
    const admin = await Admin.login(email, password);

    if (admin.isVerified && !admin.isLocked) {
      let otp = randomString(6, "0123456789");
      admin.otp = otp;
      admin.loginAttempts = 0;
      await admin.save();

      //send mail to admin
      const sendMail = async function () {
        const templatepath = path.join(
          __dirname,
          "../mailtemplates/admin/adminloginOTP.ejs"
        );
        const mailData = await ejs.renderFile(templatepath, { admin, otp });
        let mailOptions = {
          //from: process.env.MAIL_USER,
          from: {
            name: "Kriapay",
            address: process.env.MAIL_USER,
          },
          to: admin.email,
          subject: "Login Request",
          html: mailData,
        };
        transporter.sendMail(mailOptions, function (err, success) {
          if (err) {
            console.log(err);
          } else {
            console.log("sent");
          }
        });
      };
      sendMail();
      res.status(200).json({ sucess: "OTP sent successfully" });
    }
    if (!admin.isVerified) {
      error = new Error("Email not verified yet. Check your mailbox");
      error.code = 400;
      throw error;
    }

    if (admin.isLocked) {
      error = new Error(
        "Account has been locked for security reasons. Please contact support or check your mail."
      );
      error.code = 400;
      throw error;
    }
  } catch (err) {
    console.log(err);
    res.status(err.code || 400).json({ error: err.message });
  }
});

//admin login with otp
router.post("/admin/auth/login/otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    let error;
    const admin = await Admin.findOne({ email });
    //if there is no such admin
    if (!admin) {
      error = new Error("Admin not found");
      error.code = 400;
      throw error;
    }

    //if there admin but invalid otp
    if (admin.otp !== otp) {
      error = new Error("Invalid OTP. Try again or contact IT.");
      error.code = 400;
      throw error;
    }

    //after all checks
    admin.otp = null;
    await admin.save();
    const token = createToken(admin._id);
    res.cookie(process.env.TWJ, token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ success: "Login success" });
  } catch (err) {
    console.log(err);
    res.status(err.code || 400).json({ error: err.message });
  }
});

router.get("/admin/logout", async (req, res) => {
  res.cookie(process.env.TWJ, "", { maxAge: 1 });
  res.status(200).json({ success: "Logged out successfully" });
});

router.get("/admin/get-users", isAdmin, async (req, res) => {
  try {
    let error;
    const users = await User.find().select(
      "firstName middleName lastName tier isVerified createdAt phoneNumber"
    );
    if (!users) {
      error = new Error("No user found");
      error.code = 400;
      throw error;
    }
    res.status(200).json({ success: users });
  } catch (err) {
    console.log(err);
    res.status(err.code || 400).json({ error: err.message });
  }
});

router.get("/admin/get-user/:userId", isAdmin, async (req, res) => {
  const userId = req.params.userId;

  try {
    let error;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      error = new Error("User not found");
      error.code = 400;
      throw error;
    }
    res.status(200).json({ success: user });
  } catch (err) {
    console.log(err);
    res.status(err.code || 400).json({ error: err.message });
  }
});

router.post("/admin/user/lock/:userId", isAdmin, async (req, res) => {
  const { isLocked } = req.body;
  const userId = req.params.userId;
  try {
    let error;
    const user = await User.findById(userId);
    if (!user) {
      error = new Error("User not found.");
      error.code = 400;
      throw error;
    }

    user.isLocked = isLocked;
    await user.save();
    res.status(200).json({ success: "User status changed successfully" });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
});

//create a new deposit method
router.post("/admin/create-deposit-method", async (req, res) => {
  const { method, bankName, accountName, accountNo, fee, currency, min, max } =
    req.body;
  const depositMethod = await DepositMethod.create({
    method,
    bankName,
    accountName,
    accountNo,
    fee,
    currency,
    min,
    max,
  });
  res.status(200).json({ success: "Created Successfully" });
});

router.post("/admin/create-rate", async (req, res) => {
  const { name, fromCurrency, toCurrency, rate, fee } = req.body;
  try {
    const newRate = await Rate.create({
      name,
      fromCurrency,
      toCurrency,
      rate,
      fee,
    });
    if (!newRate) {
      throw new Error();
    }
    res.status(200).json({ success: "Created Successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
});

/*
router.post("/admin/create-transfer-limit", async (req, res) => {
  const { tier, limit, fee } = req.body;
  //feeType can be percentage or fixed
  try {
    const prevTierLimit = await TransferLimit.findOne({tier});
    if (prevTierLimit) {
      return res.status(500).json({error:"Tier level already exists. Please edit the existing one instead."})
    }
    const newTransferLimit = await TransferLimit.create({
      tier,
      limit,
      fee,
    });
    if (!newTransferLimit) {
      throw new Error;
    }
    return res.status(200).json({ success: "Created Successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/edit-transfer-limit", async(req,res)=>{
  const { tier, limit, fee, feeType } = req.body;
  try {
    const tierLimit = await TransferLimit.findOne({tier})
    if (!tierLimit) {
      return res.status(404).json({error:"Tier level not found. Kindly check again or create the tier level"})
    }
    tierLimit.limit = limit;
    tierLimit.fee = fee;
    tierLimit.feeType = feeType;
    await tierLimit.save();
    return res.status(201).json({success:"Transfer limit changed successfully."})
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }

})
*/

router.post("/admin/create-tier", async (req, res) => {
  const {
    tier,
    transferLimit,
    transferFee,
    transferDailtyLimit,
    depositLimit,
    depositFee,
    depositDailyLimit,
    withdrawalLimit,
    withdrawalFee,
    withdrawalDailyLimit,
    convertLimit,
    convertFee,
    convertDailyLimit,
  } = req.body;
  try {
    const prevTier = await Tier.findOne({ tier });
    if (prevTier) {
      return res.status(500).json({
        error:
          "Tier level already exists. Please edit the existing one instead.",
      });
    }
    const newTier = await Tier.create({
      tier,
      transferLimit,
      transferFee,
      transferDailtyLimit,
      depositLimit,
      depositFee,
      depositDailyLimit,
      withdrawalLimit,
      withdrawalFee,
      withdrawalDailyLimit,
      convertLimit,
      convertFee,
      convertDailyLimit,
    });
    if (!newTier) {
      throw new Error();
    }
    return res.status(200).json({ success: "Created Successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/admin/transactions", async (req, res) => {
  // Come back for editing
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type; // Type filter (e.g., 'transfer' or 'deposit')
    const fieldsToSelect = "type status amount createdAt";

    // Build the query object
    const query = {};
    if (type) {
      query.type = type; // Add type filter if provided
    }

    // Find transactions with optional type filter
    const transactions = await Transaction.find({ type: query })
      .select("type status amount createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Fetch related data based on the transaction type
    const transactionsWithDetails = await Promise.all(
      transactions.map(async (transaction) => {
        if (transaction.type === "transfer") {
          const transfer = await Transfer.findById(transaction.trans_id).select(
            "amount fromCurrency toCurrency fee currentRate"
          );
          return { ...transaction, transferDetails: transfer };
        } else if (transaction.type === "deposit") {
          const deposit = await Deposit.findById(transaction.trans_id).select(
            "amount method fee currency"
          );
          return { ...transaction, depositDetails: deposit };
        }
        return transaction;
      })
    );

    const totalCount = await Transaction.countDocuments({ type: query });

    res.status(200).json({
      transactions: transactionsWithDetails,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/admin/update-transaction/:id", async (req, res) => {
  const transId = req.params.id;
  const { status } = req.body;

  try {
    const validStatuses = ["Pending", "Successful", "Failed"];

    if (!validStatuses.includes(status)) {
      return res.status(404).json({ error: "Invalid Input" });
    }

    const trans = await Transaction.findById(transId)
    if (!trans) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    trans.status = status;
    trans.fulfilTime = new Date
    await trans.save();
    return res.status(200).json({ success: "Transaction saved" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
