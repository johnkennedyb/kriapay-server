const { Router } = require("express");
const { User } = require("../models/user");
const { appUserCheck } = require("../middleware/authMiddleware");
const { Transaction } = require("../models/transaction");
const { Transfer } = require("../models/transfer");
const { Rate } = require("../models/rate");
const mongoose = require("mongoose");
const { Tier } = require("../models/tier");
const {generateTransactionId, currencySymbols, slBanks} = require('../utils/utils')
const { Notification } = require("../models/notification");

const router = Router();

router.get('/get-sl-banks', appUserCheck, async (req,res)=> {
  try {
    res.status(200).json({success:slBanks})
  } catch (err) {
    res.status(500).json({error:"Server Error"})
  }
})

router.post("/get-transfer-essentials", appUserCheck, async (req, res) => {
    const { toCurrency, fromCurrency } = req.body;
  
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res
          .status(500)
          .json({ error: "There has been an error. Please contact support." });
      }
  
      //check for the limits and fees for this transfer using the user's tier level
      const tierLimits = await Tier.findOne({tier:user.tier});
      if (!tierLimits) {
        return res
          .status(500)
          .json({ error: "Internal server error. Please contact support." });
      }
  
      const rateObj = await Rate.findOne({ toCurrency, fromCurrency });
      if (!rateObj) {
        return res.status(500).json({
          error:
            "No rate has been set for this conversion. Please contact support.",
        });
      }
  
      //check if conversion is available
      if (!rateObj.available) {
        return res.status(500).json({
          error: `${fromCurrency} to ${toCurrency} conversion is not available at the moment. Please check back`,
        });
      }
  
      let responseDeets = {
        fee: Number(tierLimits.transferFee),
        limit: Number(tierLimits.transferLimit),
        rate: Number(rateObj.rate),
      };
  
      return res.status(200).json({ success: responseDeets });
    } catch (err) {
      console.log(err);
      res.status(400).json({ error: err.message });
    }
  });
  
  //Create a new transfer
  router.post("/new-transfer", appUserCheck, async (req, res) => {
    const {
      amount,
      fromCurrency,
      toCurrency,
      bankName,
      accountName,
      accountNo,
      fee,
      rate,
    } = req.body;
  
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      let transactionReference = generateTransactionId();
  
      if (amount === 0) {
        return res
          .status(403)
          .json({ error: "Kindly enter an amount greater than zero" });
      }
  
      const user = await User.findById(req.userId).session(session);
      if (!user) {
        return res
          .status(500)
          .json({ error: "There has been an error. Please contact support." });
      }
      if (user.tier === 0) {
        return res
          .status(403)
          .json({ error: "Dear customer, kindly upgrade to atleast tier 1 to carry out this transaction. Please contact support for any confusion." });
      }
  
      const prevTrans = await Transaction.findOne({
        transactionReference
      }).session(session);
      if (prevTrans) {
        transactionReference = generateTransactionId();
      }
      
  
      const rateObj = await Rate.findOne({ fromCurrency, toCurrency }).session(session);
      if (!rateObj) {
        return res
          .status(500)
          .json({ error: "No rate found. Please contact support." });
      }
      if (Number(rateObj.rate) !== rate) {
        return res
          .status(500)
          .json({ error: "There has been a change in rate. Kindly start the transaction again." });
      }
  
      let userBalance = 0;
      if (fromCurrency === "ngn") {
        userBalance = Number(user.ngnWalletBalance);
      } else if (fromCurrency === "usd") {
        userBalance = Number(user.usdWalletBalance);
      } else if (fromCurrency === "sle") {
        userBalance = Number(user.sleWalletBalance);
      }
  
      if (userBalance < amount + fee) {
        return res.status(403).json({ error: "Insufficient balance" });
      }
  
      //Check limit
      const tierLimit = await Tier.findOne({ tier: user.tier });
        if (!tierLimit) {
          return res.status(500).json({ error: "User tier error" });
        }
  
      if (fromCurrency === "ngn") {
        
        if (amount > Number(tierLimit.transferLimit)) {
          return res
            .status(500)
            .json({
              error:
                "Dear customer, you cannot transfer more than your tier limit",
            });
        }
      } else {
        const rate = await Rate.findOne({name:`${fromCurrency}ngn`});
        if (!rate) {
          return res.status(500).json({ error: "User tier error" });
        }
        const limitAmount = amount * Number(rate.rate);
        if (limitAmount > Number(tierLimit.transferLimit)) {
          return res
            .status(500)
            .json({
              error:
                "Dear customer, you cannot transfer more than your tier limit",
            });
        }
  
      }
  
  
      // Deduct the amount from the user's wallet balance
      if (fromCurrency === "ngn") {
        user.ngnWalletBalance -= amount + fee;
      } else if (fromCurrency === "usd") {
        user.usdWalletBalance -= amount + fee;
      } else if (fromCurrency === "sle") {
        user.sleWalletBalance -= amount + fee;
      }
      await user.save({ session });
  
      const transfer = new Transfer({
        amount,
        bankName,
        accountName,
        accountNo,
        fee,
        fromCurrency,
        toCurrency,
        currentRate: rateObj.rate,
      })
      await transfer.save({session});
  
      const newTransferTransaction = new Transaction({
        type: "Transfer",
        user_id: req.userId,
        amount,
        trans_id: (await transfer).id,
        //trans_id: transfer._id,
        transactionReference,
        status: "Pending",
        currency: fromCurrency
      });
      await newTransferTransaction.save({ session });

      const newTransferNotif = new Notification({
        title: "Transfer pending",
        content: `Your transfer of ${currencySymbols(fromCurrency)}${amount} to ${accountName} (${accountNo}) is being processed. Kindly wait a few minutes.`,
        user_id: req.userId,
        trans_id: newTransferTransaction._id
      })
      await newTransferNotif.save({session})
  
      let successObj = {
        currency: fromCurrency,
        amount: amount,
        date: new Date(),
        transactionReference: transactionReference,
        status: newTransferTransaction.status
      }

      await session.commitTransaction();
      session.endSession();     


      res.status(200).json({ success: "Transfer Initiated. Kindly wait a few minutes while we process your request.", successObj });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ error: err.message });
    }
  });

module.exports = router;