const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config()
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const transferRoutes = require('./routes/transferRoutes');
const depositRoutes = require('./routes/depositRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const currencySwapRoutes = require('./routes/currencySwapRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const receiptRoutes = require('./routes/receiptRoutes')

const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());

app.use(cookieParser());

mongoose.set('strictQuery', true)
mongoose.connect(process.env.DB_URL)
.then(function() {
    app.listen(process.env.PORT || 3000)
}).catch(function(err) {
    console.log(err);
})


app.use(authRoutes);
app.use(adminRoutes);
app.use(transactionRoutes);
app.use(transferRoutes);
app.use(depositRoutes);
app.use(withdrawalRoutes);
app.use(currencySwapRoutes);
app.use(notificationRoutes);
app.use(receiptRoutes);


app.get('/', function(req,res) {
  res.send('Server is running')
})