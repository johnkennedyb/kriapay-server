const mongoose = require('mongoose');

const currencySwapSchema = new mongoose.Schema({
    fromCurrency:{type:String},
    toCurrency:{type:String},
    fromAmount: {type:mongoose.Types.Decimal128},
    toAmount: {type:mongoose.Types.Decimal128},
    currentRate: {type:mongoose.Types.Decimal128}    
})

const CurrencySwap = mongoose.model('currencySwap', currencySwapSchema) ;

module.exports = { CurrencySwap };