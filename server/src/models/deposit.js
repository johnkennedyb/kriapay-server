const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema({
    method: {type:String},
    amount: { type: mongoose.Types.Decimal128, default: 0 },
    depositCode:{type:String},
  fee: { type: mongoose.Types.Decimal128, default: 0 },
  currency: { type: String },
  depositMethodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "depositMethod"
  },
  
});

const Deposit = mongoose.model("deposit", depositSchema);

module.exports = { Deposit };
