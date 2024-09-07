const { Router } = require("express");
const { User } = require("../models/user");
const { appUserCheck } = require("../middleware/authMiddleware");
const { Transaction } = require("../models/transaction");
const { Tier } = require("../models/tier");
const mongoose = require("mongoose");
const { generateTransactionId, currencySymbols } = require("../utils/utils");
const { UserBankDetails } = require("../models/userbankdetails");
const { Withdrawal } = require("../models/withdrawal");
const { Notification } = require("../models/notification");

const router = Router();

router.get("/get-withdrawal-essentials", appUserCheck, async (req, res) => {
  const userId = req.userId;
  try {
    let bankDetails = await UserBankDetails.findOne({ userId }).select("-_id -__v").lean()
    if (!bankDetails) {
      return res
        .status(404)
        .json({
          empty:
            "Ooops, looks like you haven't added your bank details. Kindly do that in your profile.",
        });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json({ error: "User not logged in. Please login and try again" });
    }
    if (user.isLocked) {
      return res
        .status(400)
        .json({ error: "Account Locked. Kindly contact support" });
    }

    const tier = await Tier.findOne({tier:user.tier})
    if (!tier) {
      return res
        .status(500)
        .json({ error: "Tier error. Kindly contact support" });
    }
    const fee = Number(tier.withdrawalFee);
    bankDetails = {...bankDetails, fee}

    return res.status(200).json({ success: bankDetails });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/*
router.post("/new-withdrawal", appUserCheck, async (req, res) => {
  const { currency, amount } = req.body;
  const userId = req.userId;

  const session = await mongoose.startSession();
    session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      return res
        .status(400)
        .json({ error: "User not logged in. Please login and try again" });
    }
    if (user.isLocked) {
      return res
        .status(400)
        .json({ error: "Account Locked. Kindly contact support" });
    }

    if (currency === 'usd') {
      return res
        .status(400)
        .json({ error: "Dear customer, usd withdrawals are not available at this time. Kindly convert to another currency and withdraw." });
    }

    const bankDetails = await UserBankDetails.findOne({ userId }).session(session)
    if (!bankDetails) {
      return res
        .status(404)
        .json({
          empty:
            "Ooops, looks like you haven't added your bank details. Kindly do that first",
        });
    }

    let transactionReference = generateTransactionId()
    
    if (currency === 'ngn') {
      if (Number(user.ngnWalletBalance) < amount) {
        return res.status(403).json({error: "Oops, insufficient funds"})
      } else {
        user.ngnWalletBalance = Number(user.ngnWalletBalance) - amount;
        await user.save({session})
      }
    } else if (currency === 'usd') {
      if (Number(user.usdWalletBalance) < amount) {
        return res.status(403).json({error: "Oops, insufficient funds"})
      } else {
        user.usdWalletBalance = Number(user.usdWalletBalance) - amount;
        await user.save({session})
      }
    } else if (currency === 'sle') {
      if (Number(user.sleWalletBalance) < amount) {
        return res.status(403).json({error: "Oops, insufficient funds"})
      } else {
        user.sleWalletBalance = Number(user.sleWalletBalance) - amount;
        await user.save({session})
      }
    } 

    const withdrawal = new Withdrawal({
      amount,
      currency,
      bankName: bankDetails.bankName,
      accountName: bankDetails.accountName,
      accountNo: bankDetails.accountNo
    })
    await withdrawal.save({session});

    const newWithdrawalTransaction = new Transaction({
      type: "Withdrawal",
      user_id: req.userId,
      amount,
      trans_id: (await withdrawal).id,
      //trans_id: transfer._id,
      transactionReference,
      status: "Pending",
      currency
    });
    await newWithdrawalTransaction.save({ session });

    const newWithdrawalNotif = new Notification({
      title: "Withdrawal request pending",
      content: `Your request to withdraw ${currencySymbols(currency)}${amount} to ${bankDetails.accountName} (${bankDetails.accountNo}) is being processed. Kindly wait a few minutes.`,
      user_id: req.userId,
      trans_id: newWithdrawalTransaction._id
    })
    await newWithdrawalNotif.save({session})

    let successObj = {
      currency: currency,
      amount: amount,
      date: new Date(),
      transactionReference: transactionReference,
      status: newWithdrawalTransaction.status
    }

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: "Withdrawal initiated. Kindly wait a few minutes while we process your request.", successObj });

  } catch (err) {
    console.log(err);
    return res.status(500).status({error:err.message})
  }
  
});
*/

router.post("/new-withdrawal", appUserCheck, async (req, res) => {
  const { currency, amount } = req.body;
  const userId = req.userId;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const RETRY_LIMIT = 3;
    let retryCount = 0;
    let success = false;

    while (!success && retryCount < RETRY_LIMIT) {
      try {
        // Find the user and lock the document for the transaction
        const user = await User.findById(userId).session(session).exec();
        if (!user) {
          return res.status(400).json({ error: "User not logged in. Please login and try again" });
        }
        if (user.isLocked) {
          return res.status(400).json({ error: "Account Locked. Kindly contact support" });
        }

        if (currency === 'usd') {
          return res.status(400).json({ error: "USD withdrawals are not available at this time. Please convert to another currency and withdraw." });
        }

        const bankDetails = await UserBankDetails.findOne({ userId }).session(session).exec();
        if (!bankDetails) {
          return res.status(404).json({ empty: "Please add your bank details first." });
        }

        let transactionReference = generateTransactionId();

        if (currency === 'ngn') {
          if (Number(user.ngnWalletBalance) < amount) {
            return res.status(403).json({ error: "Insufficient funds" });
          } else {
            user.ngnWalletBalance = Number(user.ngnWalletBalance) - amount;
            await user.save({ session });
          }
        } else if (currency === 'sle') {
          if (Number(user.sleWalletBalance) < amount) {
            return res.status(403).json({ error: "Insufficient funds" });
          } else {
            user.sleWalletBalance = Number(user.sleWalletBalance) - amount;
            await user.save({ session });
          }
        }

        const withdrawal = new Withdrawal({
          amount,
          currency,
          bankName: bankDetails.bankName,
          accountName: bankDetails.accountName,
          accountNo: bankDetails.accountNo
        });
        await withdrawal.save({ session });

        const newWithdrawalTransaction = new Transaction({
          type: "Withdrawal",
          user_id: req.userId,
          amount,
          trans_id: withdrawal._id,
          transactionReference,
          status: "Pending",
          currency
        });
        await newWithdrawalTransaction.save({ session });

        const newWithdrawalNotif = new Notification({
          title: "Withdrawal request pending",
          content: `Your request to withdraw ${currencySymbols(currency)}${amount} to ${bankDetails.accountName} (${bankDetails.accountNo}) is being processed.`,
          user_id: req.userId,
          trans_id: newWithdrawalTransaction._id
        });
        await newWithdrawalNotif.save({ session });

        let successObj = {
          currency: currency,
          amount: amount,
          date: new Date(),
          transactionReference: transactionReference,
          status: newWithdrawalTransaction.status
        };

        await session.commitTransaction();
        success = true; // Exit loop if successful
        session.endSession();

        return res.status(200).json({ success: "Withdrawal initiated.", successObj });

      } catch (err) {
        retryCount += 1;
        if (retryCount >= RETRY_LIMIT) {
          throw err; // Re-throw error if retry limit is reached
        }
        await session.abortTransaction(); // Abort and retry
        session.startTransaction();
      }
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});


module.exports = router;
