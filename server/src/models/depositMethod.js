const mongoose = require("mongoose");

const depositMethodSchema = new mongoose.Schema({
  method: { type: String },
  bankName: { type: String },
  accountName: { type: String },
  accountNo: { type: String },
  fee: { type: mongoose.Types.Decimal128, default: 0 },
  feeType: { type: String, enum: ["percentage"] },
  available: { type: Boolean, default: true },
  currency: { type: String },
  min: {type:mongoose.Types.Decimal128, default:100},
  max:{type:mongoose.Types.Decimal128, default:99999999}
});

const DepositMethod = mongoose.model("depositMethod", depositMethodSchema);

module.exports = { DepositMethod };
