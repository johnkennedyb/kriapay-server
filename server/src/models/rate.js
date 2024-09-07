const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
    name:{type:String},
    fromCurrency:{type:String},
    toCurrency:{type:String},
    rate: {type:mongoose.Types.Decimal128, default: 500},
    fee: {type:mongoose.Types.Decimal128, default: 0},
    feeType:{type:String,enum:["percentage"], default:'percentage'},
    available: {type:Boolean,default:true},
})

const Rate = mongoose.model('rate', rateSchema) ;

module.exports = { Rate };