const {Router} = require('express');
const fs = require('fs');
const path = require('path');
const { Transaction } = require('../models/transaction');
const { Deposit } = require('../models/deposit');
const { Transfer } = require('../models/transfer');
const { Withdrawal } = require('../models/withdrawal');
const { CurrencySwap } = require('../models/currencyswap');
const { appUserCheck } = require('../middleware/authMiddleware');
const ejs = require('ejs')
let pdf = require("html-pdf");
const { currencySymbols } = require('../utils/utils');

const router = Router()

router.get('/receipt/:transactionId', appUserCheck, async (req, res) => {


    const transId = req.params.transactionId;
  const userId = req.userId;
  let formattedData = {};

  try {
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
formattedData.transfer.fromCurrency = currencySymbols(formattedData.transfer.fromCurrency)
formattedData.transfer.toCurrency = currencySymbols(formattedData.transfer.toCurrency)



} else if (transaction.type === "Withdrawal") {
const withdrawal = await Withdrawal.findById(transaction.trans_id)
  .select("currency amount bankName accountName accountNo ")
  .lean();
if (!withdrawal) {
  return res.status(400).json({ error: "Transaction not found" });
}
formattedData = { ...transaction, withdrawal };
formattedData.amount = Number(formattedData.amount);
formattedData.withdrawal.currency = currencySymbols(formattedData.withdrawal.currency)


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
formattedData.currencyswap.fromCurrency = currencySymbols(formattedData.currencyswap.fromCurrency)
formattedData.currencyswap.toCurrency = currencySymbols(formattedData.currencyswap.toCurrency)
}

//generate pdf
let templatePath = ''
if (formattedData.type === "Transfer") {
    templatePath = '../pdfTemplates/transferTemplate.ejs'
} else if (formattedData.type === "Deposit") {
 templatePath = '../pdfTemplates/depositTemplate.ejs'

} else if (formattedData.type === "Withdrawal") {
    templatePath = '../pdfTemplates/withdrawalTemplate.ejs'

} else if (formattedData.type === "Currencyswap") {
    templatePath = '../pdfTemplates/swapTemplate.ejs'
}

// Render the HTML template with dynamic data
// const htmlContent = await ejs.renderFile(path.join(__dirname, templatePath), {
//     formattedData
//   });


ejs.renderFile(path.join(__dirname, templatePath), {formattedData}, (err, data) => {
    if (err) {
          res.send(err);
    } else {
        let options = {
            "height": "11.25in",
            "width": "8.5in",
            "header": {
                "height": "20mm"
            },
            "footer": {
                "height": "20mm",
            },
        };

        const pdfPath = path.join(__dirname+'/receipts/',`${formattedData.transactionReference}.pdf`);

        pdf.create(data, options).toFile(pdfPath, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                // Set headers to prompt download
                res.setHeader('Content-Disposition', `attachment; filename=${formattedData._id}.pdf`);
                res.setHeader('Content-Type', 'application/pdf');

                // Create a read stream and pipe it to the response
                const fileStream = fs.createReadStream(pdfPath);
                fileStream.pipe(res);

                // Optionally, delete the file after sending it
                fileStream.on('end', function () {
                    fs.unlinkSync(pdfPath);
                });
            }
        });
    }
});










//res.status(200).json({ success: formattedData });

  } catch (err) {
    console.log(err);
    res.status(500).json({error:"Server Error"})
  }

 
});

module.exports= router