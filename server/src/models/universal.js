/*

const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
    rate: {type:Number, default: 500},
    fee: {type:Number, default: 0},
    dailyLimit: {type:Number, default: 1000},
    available: {type:Boolean,default:true},
    tier0Limit: {type:Number, default: 0},
    tier1Limit: {type:Number, default: 100},
    tier2Limit: {type:Number, default: 100},
    tier3Limit: {type:Number, default: 100},
})


const universalSchema = new mongoose.Schema(
    {
        usdngn: rateSchema,
        usdsll: rateSchema,
        ngnsll: rateSchema,
        ngnusd: rateSchema,
        sllusd: rateSchema,
        sllngn: rateSchema,
        
    }
)

const Universal = mongoose.model('universal', universalSchema) ;

module.exports = { Universal };
*/