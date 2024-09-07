const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  type: {
    type: String,
  },
  amount: {
    type: mongoose.Types.Decimal128,
  },
  currency:{
    type: String,
    enum: ['ngn','sle','usd']
  },
  status: {
    type: String,
    enum: ["Pending","Successful","Failed","Completed"],
    default: "Pending"
  },
  failedStatus: {
    type: String,
    default: "g",
  },
  transactionReference: {
    type: String,
    unique: true
  },
  transactionNumber: {
    type: Number,
  },
  fulfilTime:{
    type: Date
  },

  trans_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    /*
    validate: {
      validator: async function(v) {
        if (this.type === 'transfer') {
          const transfer = await mongoose.model('transfer').findById(v);
          return !!transfer; // Return true if transfer exists
        } else if (this.type === 'deposit') {
          const deposit = await mongoose.model('deposit').findById(v);
          return !!deposit; // Return true if deposit exists
        }
        return false;
      },
      message: props => `Invalid trans_id for the specified type: ${props.value}`
    }
      */
    
  }
    

});
transactionSchema.set("timestamps", true);

const Transaction = mongoose.model("transaction", transactionSchema);

module.exports = { Transaction };
