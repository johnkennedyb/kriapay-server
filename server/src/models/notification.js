const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
        },
        content: {
            type: String,
        },
        status:{
            type: String,
            default: "unread"
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        trans_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "transaction"
        }
        
    }
).set('timestamps', true);

const Notification = mongoose.model('notification', notificationSchema) ;

module.exports = { Notification };