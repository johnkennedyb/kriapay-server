const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    currency:{type:String},
    fee: {type:mongoose.Types.Decimal128, default: 0},
    amount: {type:mongoose.Types.Decimal128},
    bankName: {type:String,required:true},
    accountNo:{type:String,required:true},
    accountName:{type:String,required:true}

})

const Withdrawal = mongoose.model('withdrawal', withdrawalSchema) ;

module.exports = { Withdrawal };