const { Router } = require("express");
const { User } = require("../models/user");
const { Rate } = require("../models/rate");
const { CurrencySwap } = require("../models/currencyswap");
const mongoose = require("mongoose");
const { appUserCheck } = require("../middleware/authMiddleware");
const { generateTransactionId, currencySymbols} = require("../utils/utils");
const { Transaction } = require("../models/transaction");
const { Notification } = require("../models/notification");

const router = Router();

router.get("/get-rates", appUserCheck, async (req, res) => {
  try {
    const rates = await Rate.find().select("-_id -__v").lean();
    if (!rates) {
      return res
        .status(404)
        .json({
          error: "Cannot get rates. Kindly contact support or try again",
        });
    }

    for (let i = 0; i < rates.length; i++) {
      rates[i].rate = Number(rates[i].rate);
      rates[i].fee = Number(rates[i].fee);
    }

    res.status(200).json({ success: rates });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/new-swap", appUserCheck, async (req, res) => {
  const { fromCurrency, toCurrency, fromAmount, toAmount, rate } = req.body;
  const userId = req.userId;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      return res.status(404).json({ error: "Please log in first" });
    }

    if (user.isLocked) {
      return res
        .status(403)
        .json({
          error: "Account Locked. Kindly contact the admin to unlock it",
        });
    }

    const rateDB = await Rate.findOne({ fromCurrency, toCurrency }).session(
      session
    );
    if (!rateDB) {
      return res
        .status(404)
        .json({ error: "Rate cannot be found. Kindly contact support" });
    }

    if (rate !== Number(rateDB.rate)) {
      return res
        .status(500)
        .json({
          error:
            "Oops, looks like the rates have changed. Kindly initiate the transaction again",
        });
    }

    let topUp = fromAmount * rateDB.rate;

    let transactionReference = generateTransactionId();

    if (fromCurrency === "ngn") {
      if (user.ngnWalletBalance < fromAmount) {
        return res.status(403).json({ error: "Oops, insufficient funds" });
      } else {
        user.ngnWalletBalance = Number(user.ngnWalletBalance) - fromAmount;
      }
    } else if (fromCurrency === "usd") {
      if (Number(user.usdWalletBalance) < fromAmount) {
        return res.status(403).json({ error: "Oops, insufficient funds" });
      } else {
        user.usdWalletBalance = Number(user.usdWalletBalance) - fromAmount;
      }
    } else if (fromCurrency === "sle") {
      if (Number(user.sleWalletBalance) < fromAmount) {
        return res.status(403).json({ error: "Oops, insufficient funds" });
      } else {
        user.sleWalletBalance = Number(user.sleWalletBalance) - fromAmount;
      }
    }

    if (toCurrency === "ngn") {
      user.ngnWalletBalance = Number(user.ngnWalletBalance) + topUp;
    } else if (toCurrency === "usd") {
      user.usdWalletBalance = Number(user.usdWalletBalance) + topUp;
    } else if (toCurrency === "sle") {
      user.sleWalletBalance = Number(user.sleWalletBalance) + topUp;
    }

    await user.save({ session });

    const swap = new CurrencySwap({
      fromAmount,
      fromCurrency,
      toAmount,
      toCurrency,
      currrentRate: rateDB.rate,
    });
    await swap.save({ session });

    const newSwapTransaction = new Transaction({
      type: "Currencyswap",
      user_id: req.userId,
      amount: fromAmount,
      trans_id: (await swap).id,
      //trans_id: transfer._id,
      transactionReference,
      status: "Successful",
      currency: fromCurrency
    });
    await newSwapTransaction.save({ session });

    const newSwapNotif = new Notification({
      title: "Swap successful",
      content: `Your request to swap ${currencySymbols(fromCurrency)}${fromAmount} to ${currencySymbols(toCurrency)}${toAmount} was successful.`,
      user_id: req.userId,
      trans_id: newSwapTransaction._id
    })
    await newSwapNotif.save({session})

    let successObj = {
      currency: fromCurrency,
      amount: fromAmount,
      date: new Date(),
      transactionReference: transactionReference,
      status: newSwapTransaction.status
    }
    
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: "Swap successful!", successObj });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .status({
        error: " Something went wrong. Please try again or contact support",
      });
  }
});

module.exports = router;
