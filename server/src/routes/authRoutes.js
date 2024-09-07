const { Router } = require("express");
const { User } = require("../models/user");
let { transporter } = require("../mail/mail");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ejs = require("ejs");
const { appUserCheck } = require("../middleware/authMiddleware");
const { UserBankDetails } = require("../models/userbankdetails");
const mongoose = require("mongoose");

//generate random alphanumeric string
function randomString(length, chars) {
  var result = "";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

const createToken = function (id) {
  return jwt.sign({ id }, process.env.TWJ, {
    //change figure
    expiresIn: "10m",
  });
};

const router = Router();

//user signup
router.post("/auth/signup", async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    phoneNumber,
    email,
    referrer,
    dateOfbirth,
    countryOfResidence,
    defaultCurrency,
  } = req.body;

  //let emailToken = randomString(64, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  let otp = randomString(6, "0123456789");
  let referralID =
    firstName.substring(0, 3) +
    randomString(
      7,
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    );
  try {
    //create user in database
    const user = await User.create({
      firstName,
      middleName,
      lastName,
      phoneNumber,
      email,
      dateOfBirth: dateOfbirth,
      countryOfResidence,
      referralID,
      referrer,
      otp,
      defaultCurrency,
    });
    //send user sign up mail
    const sendMail = async function () {
      //send transaction mail to user
      const templatepath = path.join(
        __dirname,
        "../mailtemplates/user/verifyEmail.ejs"
      );
      const mailData = await ejs.renderFile(templatepath, { user, otp });
      let mailOptions = {
        //from: process.env.MAIL_USER,
        from: {
          name: "KriaPay",
          address: process.env.MAIL_USER,
        },
        to: user.email,
        subject: "Verify Your Account",
        html: mailData,
      };

      transporter.sendMail(mailOptions, function (err, success) {
        if (err) {
          console.log(err);
        } else {
          console.log("sent");
        }
      });
    };
    sendMail();

    res.status(201).json({ success: "Sign up successful" });
    return;
  } catch (err) {
    console.log(err);

    //duplicate error code
    if (err.code === 11000) {
      res
        .status(400)
        .json({
          error:
            "Sorry, either the email or phone number is already taken. Please try another.",
        });
    } else {
      res.status(400).json({ error: err.message });
    }

    //validation errors
    /*if (err.message.includes('user validation failed')) {
                Object.values(err.errors).forEach(({properties}) => {
                    errors[properties.path] = properties.message;
                    console.log(error.properties);
                })
            }*/
  }
});

//verify otp
router.patch("/auth/verify-account-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found. Kindly contact support");
    }
    if (user.otp !== otp) {
      throw new Error("Invalid OTP. Kindly retry or request a new one.");
    }
    user.otp = "";
    user.isVerified = true;
    await user.save();
    return res.status(200).json({ success: "Email verified successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  }
});

//resend otp during onboarding
router.patch("/auth/resend-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found. Kindly contact support");
    }

    let otp = randomString(6, "0123456789");
    user.otp = otp;
    await user.save();

    const sendMail = async function () {
      //send transaction mail to user
      const templatepath = path.join(
        __dirname,
        "../mailtemplates/verifyEmail.ejs"
      );
      const mailData = await ejs.renderFile(templatepath, { user, otp });
      let mailOptions = {
        //from: process.env.MAIL_USER,
        from: {
          name: "KriaPay",
          address: process.env.MAIL_USER,
        },
        to: user.email,
        subject: "Your one time password",
        html: mailData,
      };

      transporter.sendMail(mailOptions, function (err, success) {
        if (err) {
          console.log(err);
        } else {
          console.log("sent");
        }
      });
    };
    sendMail();

    return res.status(200).json({ success: "OTP resent successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  }
});

//create password
router.patch("/auth/create-password", async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  try {
    let error;
    const user = await User.findOne({ email });
    if (!user) {
      error = new Error("There's been an error. No user found.");
      error.code = 400;
      throw error;
    }

    if (!user.isVerified) {
      error = new Error(
        "User not verified. Kindly check yor email again or contact support."
      );
      error.code = 400;
      throw error;
    }

    if (password !== confirmPassword) {
      error = new Error("Password mismatch. Kindly check and try again.");
      error.code = 400;
      throw error;
    }

    user.password = password;
    await user.save();
    res.status(200).json({ success: "Password saved successfully." });
  } catch (err) {
    console.log(err);
    res.status(err.code || 400).json({ error: err.message });
    return;
  }
});

//create password
router.patch("/auth/create-pin", async (req, res) => {
  const { email, pin } = req.body;
  try {
    let error;
    const user = await User.findOne({ email });
    if (!user) {
      error = new Error("There's been an error. No user found.");
      error.code = 400;
      throw error;
    }

    if (!user.isVerified) {
      error = new Error(
        "User not verified. Kindly check yor email again or contact support."
      );
      error.code = 400;
      throw error;
    }

    user.pin = pin;
    await user.save();
    res.status(200).json({ success: "Pin created successfully." });
  } catch (err) {
    console.log(err);
    res.status(err.code || 400).json({ error: err.message });
    return;
  }
});

//user login before otp
router.post("/auth/login", async (req, res) => {
  //console.log(req.body);
  const { email, password } = req.body;
  console.log(email, password);

  try {
    let error;
    const user = await User.login(email, password);

    if (user.isVerified && !user.isLocked) {
      const token = createToken(user._id);

      res
        .status(200)
        .json({
          success: "Login successful, redirecting...",
          kriapayToken: token,
          expiresIn:'600'
        });
    }
    if (!user.isVerified) {
      error = new Error("Email not verified yet. Check your mailbox");
      error.code = 400;
      throw error;
    }

    if (user.isLocked) {
      error = new Error(
        "Account has been locked for security reasons. Please contact support or check your mail."
      );
      error.code = 400;
      throw error;
    }
  } catch (err) {
    console.log(err);
    res.status(err.code || 400).json({ error: err.message });
  }
});

router.post("/auth/login/otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    let error;
    const user = await User.findOne({ email });

    if (user.otp === otp) {
      user.loginAttempts = 0;
      user.otp = "";
      await user.save();
      const token = createToken(user._id);
      console.log(token);

      res
        .status(200)
        .json({
          success: "Login successful, redirecting...",
          kriapayToken: token,
        });
    } else {
      if (user.loginAttempts < 5) user.loginAttempts = user.loginAttempts + 1;
      await user.save();
      error = new Error(
        `Invalid otp. You have ${5 - user.loginAttempts} chances more.`
      );
      error.code = 400;
      throw error;
    }
  } catch (err) {
    console.log(err);
    res.status(err.code | 400).json({ error: err.message });
    return;
  }
});
router.get("/logout", async (req, res) => {
  res.cookie(process.env.TWJ, "", { maxAge: 1 });
  res.status(200).json({ success: "Logged out successfully" });
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    /*
    let passwordToken = randomString(
      64,
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    );
    */

    const user = await User.findOne({ email });

    if (user) {
      //user.passwordToken = passwordToken;
      let otp = randomString(6, "0123456789");
      user.otp = otp;
      await user.save();
      //send user sign up mail
      const sendMail = async function () {
        //send transaction mail to user
        const templatepath = path.join(
          __dirname,
          "../mailtemplates/user/postForgotPassword.ejs"
        );
        const mailData = await ejs.renderFile(templatepath, { user, otp });

        let mailOptions = {
          from: {
            name: "Kriapay",
            address: process.env.MAIL_USER,
          },
          to: user.email,
          subject: "Password Reset",
          html: mailData,
        };

        transporter.sendMail(mailOptions, function (err, success) {
          if (err) {
            console.log(err);
          } else {
            console.log("sent");
          }
        });
      };
      sendMail();
    }
    res.status(201).json({ user: user._id });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/auth/forgot-password/otp", async (req, res) => {
  const { email, otp, password } = req.body;
  try {
    let error;
    const user = await User.findOne({ email });

    if (user) {
      if (user.otp !== otp) {
        error = new Error(
          `Incorrect OTP. Your acount will be locked after many incorrect inputs.`
        );
        error.code = 400;
        throw error;
      }
      user.password = password;
      user.otp = "";
      await user.save();

      //send mail to user
      const sendMail = async function () {
        //send transaction mail to user
        const templatepath = path.join(
          __dirname,
          "../mailtemplates/user/passwordChanged.ejs"
        );
        const mailData = await ejs.renderFile(templatepath, { user });

        let mailOptions = {
          from: {
            name: "Kriapay",
            address: process.env.MAIL_USER,
          },
          to: user.email,
          subject: "Password Successfully Changed",
          html: mailData,
        };

        transporter.sendMail(mailOptions, function (err, success) {
          if (err) {
            console.log(err);
          } else {
            console.log("sent");
          }
        });
      };
      sendMail();

      res.status(201).json({ success: "Password changed successfully" });
    } else {
      error = new Error(`User not found`);
      error.code = 400;
      throw error;
    }
  } catch (err) {
    console.log(err);
    res.status(err.code | 400).json({ error: err.message });
    return;
  }
});

router.get("/get-profile-details", appUserCheck, async (req, res) => {
  const userId = req.userId;

  try {
    //add dateOfBirth profilePic
    const user = await User.findById(userId)
      .select(
        "firstName middleName lastName email phoneNumber dateOfBirth tier defaultCurrency referralID"
      )
      .lean();
    if (!user) {
      return res
        .status(401)
        .json({ error: "User not logged in. Please log in and try again." });
    }

    res.status(200).json({ success: user });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch(
  "/auth/edit-profile/change-password",
  appUserCheck,
  async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
      let error;
      const user = await User.findOne({ email: req.email });

      if (user) {
        const auth = await bcrypt.compare(oldPassword, user.password);
        if (auth) {
          user.password = newPassword;
          await user.save();

          //send mail to user
          const sendMail = async function () {
            //send transaction mail to user
            const templatepath = path.join(
              __dirname,
              "../mailtemplates/user/passwordChanged.ejs"
            );
            const mailData = await ejs.renderFile(templatepath, { user });

            let mailOptions = {
              from: {
                name: "Kriapay",
                address: process.env.MAIL_USER,
              },
              to: user.email,
              subject: "Password Successfully Changed",
              html: mailData,
            };

            transporter.sendMail(mailOptions, function (err, success) {
              if (err) {
                console.log(err);
              } else {
                console.log("sent");
              }
            });
          };
          sendMail();

          res.status(201).json({ user: user._id });
        } else {
          error = new Error(`Incorrect password`);
          error.code = 400;
          throw error;
        }
      } else {
        error = new Error(`An error occured`);
        error.code = 400;
        throw error;
      }
    } catch (err) {
      console.log(err);
      res.status(err.code | 400).json({ error: err.message });
      return;
    }
  }
);

router.patch("/auth/edit-profile/change-pin", appUserCheck, async (req, res) => {
    const { oldPin, newPin } = req.body;
    try {
      let error;
      const user = await User.findOne({ email: req.email });

      if (user) {
        const auth = await bcrypt.compare(oldPin, user.pin);
        if (!auth) {
          return res.status(400).json({ error: "Incorrect Pin" });
        }
        user.pin = newPin;
        await user.save();

        //send mail to user
        const sendMail = async function () {
          //send transaction mail to user
          const templatepath = path.join(
            __dirname,
            "../mailtemplates/user/pinChanged.ejs"
          );
          const mailData = await ejs.renderFile(templatepath, { user });

          let mailOptions = {
            from: {
              name: "Kriapay",
              address: process.env.MAIL_USER,
            },
            to: user.email,
            subject: "Pin Successfully Changed",
            html: mailData,
          };

          transporter.sendMail(mailOptions, function (err, success) {
            if (err) {
              console.log(err);
            } else {
              console.log("sent");
            }
          });
        };
        sendMail();

        res.status(201).json({ user: user._id });
      }
    } catch (err) {
      console.log(err);
      res.status(err.code | 400).json({ error: err.message });
      return;
    }
  }
);

router.post("/auth/onboarding/add-withdrawal-info", async (req, res) => {
  const { email, accountNo, accountName, bankName } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findOne({ email }).session(session);
    if (!user) {
      return res.status(400).json({ error: "Kindly login to continue." });
    }

    const prevDetails = await UserBankDetails.findOne({
      userId: user._id,
    }).session(session);
    if (prevDetails) {
      return res
        .status(401)
        .json({
          error:
            "Dear customer, it looks like you have filled in these details before. Kindly contact support if there is any confusion.",
        });
    }

    const newDetails = new UserBankDetails({
      userId: user._id,
      bankName,
      accountName,
      accountNo,
    });
    await newDetails.save({ session });

    user.tier = 1
    await user.save({session})

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: "Details updated successfully." });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/auth/get-biometrics-for-auth", appUserCheck, async (req, res) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ autherror: "Kindly login to proceed." });
    }
    res.status(200).json({success: user.useBiometricsForTrans})
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/auth/use-biometrics-for-auth", appUserCheck, async (req, res) => {
  const userId = req.userId;
  const { selection } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ autherror: "Kindly login to proceed." });
    }

    user.useBiometricsForTrans = selection;
    await user.save();

    res.status(200).json({success: 'Selection saved successfully'})
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
