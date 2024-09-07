const { Router } = require("express");
const { User } = require("../models/user");
const { appUserCheck } = require("../middleware/authMiddleware");
const { Deposit } = require("../models/deposit");
const { Transaction } = require("../models/transaction");
const { Transfer } = require("../models/transfer");
const { Rate } = require("../models/rate");
const bcrypt = require("bcryptjs");
const { Withdrawal } = require("../models/withdrawal");
const { CurrencySwap } = require("../models/currencyswap");

const router = Router();

//get wallet balance
router.get("/get-user-balance", appUserCheck, async (req, res) => {
  //currency is ngn,sle,usd
  try {
    const user = await User.findById(req.userId);
    if (user) {
      let balances = {
        ngn: Number(user.ngnWalletBalance),
        usd: Number(user.usdWalletBalance),
        sle: Number(user.sleWalletBalance),
      };
      console.log(balances);
      res.status(200).json({ success: balances });
    } else {
      res.status(400).json({ error: "Could not retrieve balance for user" });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//getting the exchange figure
router.post("/get-conversion", appUserCheck, async (req, res) => {
  const { fromCurrency, toCurrency, amount } = req.body;

  try {
    let conversionRate;
    const rate = await Rate.findOne({ fromCurrency, toCurrency });
    if (!rate) {
      throw new Error("Rate not found for conversion");
    }
    conversionRate = rate.rate;

    // switch (fromCurrency) {
    //   case "usd":
    //     switch (toCurrency) {
    //       case "ngn":
    //         conversionRate = rateDB.usdngn; // Example rate: 1 USD = 410 NGN
    //         break;
    //       case "sle":
    //         conversionRate = rateDB.usdsle; // Example rate: 1 USD = 10500 SLE
    //         break;
    //       case "usd":
    //         conversionRate = 1;
    //         break;
    //       default:
    //         error = new Error(`Unsupported currency: ${fromCurrency}`);
    //         error.code = 400;
    //         throw error;
    //     }
    //     break;

    //   case "ngn":
    //     switch (toCurrency) {
    //       case "usd":
    //         conversionRate = rateDB.ngnusd; // Example rate: 1 NGN = 0.0024 USD
    //         break;
    //       case "sle":
    //         conversionRate = rateDB.ngnsle; // Example rate: 1 NGN = 25.61 sle
    //         break;
    //       case "ngn":
    //         conversionRate = 1;
    //         break;
    //       default:
    //         error = new Error(`Unsupported currency: ${fromCurrency}`);
    //         error.code = 400;
    //         throw error;
    //     }
    //     break;

    //   case "sle":
    //     switch (toCurrency) {
    //       case "usd":
    //         conversionRate = rateDB.sleusd; // Example rate: 1 sle = 0.000095 USD
    //         break;
    //       case "ngn":
    //         conversionRate = rateDB.slengn; // Example rate: 1 sle = 0.039 NGN
    //         break;
    //       case "sle":
    //         conversionRate = 1;
    //         break;
    //       default:
    //         error = new Error(`Unsupported currency: ${fromCurrency}`);
    //         error.code = 400;
    //         throw error;
    //     }
    //     break;

    //   default:
    //     error = new Error(`Unsupported currency: ${fromCurrency}`);
    //     error.code = 400;
    //     throw error;
    // }

    let convertedAmount = amount * conversionRate;
    res.status(200).json({ success: convertedAmount });
  } catch (err) {
    console.log(err);
    res.status(err.code | 500).json({ error: err.message });
    return;
  }
});

router.get("/get-transaction/:id", appUserCheck, async (req, res) => {
  const transId = req.params.id;
  const userId = req.userId;
  let formattedData = {};

  const transaction = await Transaction.findOne({_id:transId,user_id:userId})
    .populate("user_id", "firstName lastName email")
    .lean();

  if (!transaction) {
    return res.status(400).json({ error: "Transaction not found" });
  }

  if (transaction.type === "Deposit") {
    const deposit = await Deposit.findById(transaction.trans_id)
      .populate(
        "depositMethodId",
        "method bankName accountName accountNo currency"
      )
      .lean();
    if (!deposit) {
      return res.status(400).json({ error: "Transaction/Deposit not found" });
    }
    formattedData = { ...transaction, deposit };
    formattedData.amount = Number(formattedData.amount);
  } else if (transaction.type === "Transfer") {
    const transfer = await Transfer.findById(transaction.trans_id)
      .select(
        "fromCurrency toCurrency bankName accountName accountNo currentRate fee"
      )
      .lean();
    if (!transfer) {
      return res.status(400).json({ error: "Transaction not found" });
    }
    formattedData = { ...transaction, transfer };
    formattedData.amount = Number(formattedData.amount);
    formattedData.transfer.currentRate = Number(
      formattedData.transfer.currentRate
    );
    formattedData.transfer.fee = Number(formattedData.transfer.fee);
  } else if (transaction.type === "Withdrawal") {
    const withdrawal = await Withdrawal.findById(transaction.trans_id)
      .select("currency amount bankName accountName accountNo ")
      .lean();
    if (!withdrawal) {
      return res.status(400).json({ error: "Transaction not found" });
    }
    formattedData = { ...transaction, withdrawal };
    formattedData.amount = Number(formattedData.amount);
    formattedData.withdrawal.amount = Number(formattedData.withdrawal.amount);
  } else if (transaction.type === "Currencyswap") {
    const currencyswap = await CurrencySwap.findById(transaction.trans_id)
      .select("currentRate fromAmount toAmount fromCurrency toCurrency")
      .lean();
    if (!currencyswap) {
      return res.status(400).json({ error: "Transaction not found" });
    }
    formattedData = { ...transaction, currencyswap };
    formattedData.amount = Number(formattedData.amount);
    formattedData.currencyswap.fromAmount = Number(
      formattedData.currencyswap.fromAmount
    );
    formattedData.currencyswap.toAmount = Number(
      formattedData.currencyswap.toAmount
    );
  }

  res.status(200).json({ success: formattedData });
});

router.get("/get-user-transactions", appUserCheck, async (req, res) => {
  const userId = req.userId;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type; //could be transfer deposit withdrawal exchange

    // Build the query object
    const query = {};
    if (type) {
      query.type = type;
    }
    query.user_id = userId;

    const transactions = await Transaction.find(query).sort({createdAt:-1})
      .select("type status amount currency createdAt updatedAt transactionReference trans_id")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    for (let index = 0; index < transactions.length; index++) {
      transactions[index].amount = Number(transactions[index].amount);
      if (transactions[index].type === "Transfer") {
        const transfer = await Transfer.findById(transactions[index].trans_id)
          .select(
            "accountName"
          )
          .lean();
        transactions[index] = {...transactions[index], transfer}
      }
    }

    const totalCount = await Transaction.countDocuments(query);

    res.status(200).json({
      transactions,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//pin confirm
router.post("/confirm-pin", appUserCheck, async (req, res) => {
  const { pin } = req.body;
  const userId = req.userId;

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

  const auth = await bcrypt.compare(pin, user.pin);
  if (!auth) {
    if (user.loginAttempts < 5) {
      user.loginAttempts = user.loginAttempts + 1;
      await user.save();
      return res.status(400).json({ error: "Incorrect pin" });
    } else if (user.loginAttempts === 5) {
      user.loginAttempts = 0;
      user.isLocked = true;
      await user.save();
      return res
        .status(400)
        .json({
          error:
            "Incorrect pin. Your account has also been locked. kindly contact support",
        });
    } else {
      return res.status(400).json({ error: "Incorrect pin" });
    }
  }

  res.status(200).json({ success: "Correct pin" });
});

module.exports = router;
