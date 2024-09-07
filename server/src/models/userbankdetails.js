const mongoose = require('mongoose');

const userBankDetailsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
    bankName: {type:String,required:true},
    accountNo:{type:String,required:true},
    accountName:{type:String,required:true}
})

const UserBankDetails = mongoose.model('userBankDetails', userBankDetailsSchema) ;

module.exports = { UserBankDetails };