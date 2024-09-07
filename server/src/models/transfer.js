const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema({
    amount: {type:mongoose.Types.Decimal128},
  fromCurrency: { type: String,enum:["ngn","usd","sle"] },
  toCurrency: { type: String,enum:["ngn","usd","sle"] },
  fee: { type: mongoose.Types.Decimal128, default: 0 },
  currentRate:{type:String},
  bankName: { type: String },
  accountName: { type: String },
  accountNo: { type: String },
});
transferSchema.set("timestamps", true);

const Transfer = mongoose.model("transfer", transferSchema);

module.exports = { Transfer };
