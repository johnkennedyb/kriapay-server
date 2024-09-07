const mongoose = require("mongoose");

const tierSchema = new mongoose.Schema({
  tier: {type: Number,enum: [0, 1, 2, 3], unique: true},
  transferLimit: {type: mongoose.Types.Decimal128},
  transferFee: { type: mongoose.Types.Decimal128, default: 0 },
  transferDailyLimit: { type: String, default: 99999999 },
  transferAvailable: { type: Boolean, default: true },
  depositLimit: {type: mongoose.Types.Decimal128},
  depositFee: { type: mongoose.Types.Decimal128, default: 0 },
  depositDailyLimit: { type: mongoose.Types.Decimal128, default: 99999999 },
  depositAvailable: { type: Boolean, default: true },
  withdrawalLimit: {type: mongoose.Types.Decimal128},
  withdrawalFee: { type: mongoose.Types.Decimal128, default: 0 },
  withdrawalDailyLimit: { type: mongoose.Types.Decimal128, default: 99999999 },
  withdrawalAvailable: { type: Boolean, default: true },
  convertLimit: {type: mongoose.Types.Decimal128},
  convertFee: { type: mongoose.Types.Decimal128, default: 0 },
  convertDailyLimit: { type: mongoose.Types.Decimal128, default: 99999999 },
  convertAvailable: { type: Boolean, default: true },
});

const Tier = mongoose.model("tier", tierSchema);

module.exports = { Tier };
