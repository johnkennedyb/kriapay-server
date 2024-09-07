const { v4: uuidv4 } = require("uuid");

//generate random alphanumeric string
function randomString(length, chars) {
  var result = "";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

const generateTransactionId = ()=>{
  const year = new Date().getFullYear().toString().slice(2)
  const month = (new Date().getMonth()+1).toString().padStart(2,0)
  const day = new Date().getDate().toString()

    return "kria_"+year+month+day+ randomString(8, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"); // Generates a unique transaction ID
  }
  
  const currencySymbols = (currency)=> {
    if (currency === 'ngn') {
      return '₦'
    } else if (currency === 'usd') {
      return '$'
    } else if (currency === 'sle') {
      return 'Le'
    } else {
      return ''
    }
  }

  const slBanks = {
      "access_bank":"Access Bank (SL) Limted",
      "africell_money":"Africell Money",
      "bank_of_sierra_leone":"Bank of Sierra Leone",
      "bank_phb":"Bank PHB (SL) Limited",
      "ecobank_bank":"Ecobank Bank (SL) Limited",
      "first_international_bank":"First International Bank (SL)",
      "guarantee_trust_bank":"Guarantee Trust Bank (SL)",
      "international_commercial_bank":"International Commercial Bank (SL)",
      "orange_money":"Orange Money",
      "rokel_commercial_bank":"Rokel Commercial Bank (SL)",
      "sierra_leone_commercial_bank":"Sierra Leone Commercial Bank (SL)",
      "skye_bank":"Skye Bank",
      "standard_chartered_bank":"Standrd Chartered Bank",
      "tigo_money":"Tigo Money",
      "union_trust_bank_limited":"Union Trust Bank Limited",
      "united_bank_for_africa":"United Bank for Africa",
      "zenith_bank":"Zenith Bank (SL) Limited",

  }



module.exports = { generateTransactionId, currencySymbols,slBanks }