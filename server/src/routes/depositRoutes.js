const { Router } = require("express");
const { User } = require("../models/user");
const { appUserCheck } = require("../middleware/authMiddleware");
const { Transaction } = require("../models/transaction");
const { Deposit } = require("../models/deposit");
const { Rate } = require("../models/rate");
const mongoose = require("mongoose");
const { Tier } = require("../models/tier");
const {generateTransactionId, currencySymbols} = require('../utils/utils')
const { DepositMethod } = require("../models/depositMethod");
const { Notification } = require("../models/notification");

const router = Router();

router.get('/get-deposit-essentials', appUserCheck, async(req,res)=>{
    
    try {
        const groupedDepositMethods = await DepositMethod.aggregate([
            {
              $group: {
                _id: "$currency",
                methods: {
                  $push: {
                    id: "$_id",
                    method: "$method",
                    bankName: "$bankName",
                    accountName: "$accountName",
                    accountNo: "$accountNo",
                    fee: { $toDouble: "$fee" },
                    available: "$available",
                    min: { $toDouble: "$min" },
                    max: { $toDouble: "$max" }
                  }
                }
              }
            }
          ]);

          res.status(200).json({success:groupedDepositMethods});
    } catch (err) {
        console.log(err);
        res.status(500).json({error:"There has been an error, please try again or contact support"})
    }

  })
  
  //Create a new deposit
  router.post("/new-deposit", appUserCheck, async (req, res) => {
    const { methodId, amount, depositCode, fee, currency } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        let transactionReference = generateTransactionId();
    
  
    const user = await User.findById(req.userId).session(session);
    if (!user) {
      return res
        .status(500)
        .json({ error: "There has been an error. Please contact support" });
    }

    const prevTrans = await Transaction.findOne({
        transactionReference
      }).session(session);
      if (prevTrans) {
        transactionReference = generateTransactionId();
      }
  
    const depositmethod = await DepositMethod.findById(methodId).session(session)
    if (!depositmethod) {
      return res
        .status(400)
        .json({ error: "Error finding deposit method. Please check again." });
    }
    if( !depositmethod.available) {
        return res
        .status(400)
        .json({ error: "Deposit method not available right now. Please use another method." });
    }
    if (amount < Number(depositmethod.min) || amount > Number(depositmethod.max)) {
        return res
        .status(400)
        .json({ error: "Kindly enter a figure not less than the minimum and not more than the maximum for this deposit." });
    }
    if (currency !== depositmethod.currency) {
        return res
        .status(500)
        .json({ error: "Invalid currency. Please contact the admin" });
    }
    if (fee !== Number(depositmethod.fee)) {
        return res
        .status(500)
        .json({ error: "Oops, looks like the fee has changed. Kindly restart the transaction to get the updated fee and proceed" });
    }

    const deposit = new Deposit({
        depositMethodId: methodId,
        amount,
        depositCode,
        fee,
        currency
    })
    await deposit.save({session});
  
    const newDepositTransaction = new Transaction({
      type: "Deposit",
      amount,
      user_id: req.userId,
      trans_id: (await deposit).id,
      status: "Pending",
      transactionReference,
      currency
    });
      await newDepositTransaction.save({session});

      const newDepositNotif = new Notification({
        title: "Deposit pending",
        content: `Your deposit of ${currencySymbols(currency)}${amount} is being processed. Kindly wait a few minutes.`,
        user_id: req.userId,
        trans_id: newDepositTransaction._id
      })
      await newDepositNotif.save({session})

      let successObj = {
        currency: currency,
        amount: amount,
        date: new Date(),
        transactionReference: transactionReference,
        status: newDepositTransaction.status
      }

      await session.commitTransaction();
      session.endSession();
      res.status(200).json({ success: "Successful. Dear customer, kindly wait a few minutes for your account to be topped up.",successObj });
    
    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err.message });
    }
      
  });


module.exports = router