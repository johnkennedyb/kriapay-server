const mongoose = require("mongoose");

const transferLimitSchema = new mongoose.Schema({
  tier: {
    type: Number,
    enum: [0, 1, 2, 3],
    unique:true
  },
  limit: {
    type: mongoose.Types.Decimal128,
  },
  fee: { type: mongoose.Types.Decimal128, default: 0 },
  feeType:{type:String, enum:["percentage"],default:"percentage"},
  dailyLimit: { type: mongoose.Types.Decimal128, default: 1000 },
  available: { type: Boolean, default: true },
});

const TransferLimit = mongoose.model("transferLimit", transferLimitSchema);

module.exports = { TransferLimit };
