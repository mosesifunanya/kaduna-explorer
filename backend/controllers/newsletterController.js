const Newsletter = require("../models/newsletterModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/sendEmail");

exports.subscribe = catchAsync(async (req, res, next) => {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  if (!email) {
    return next(new AppError("Please provide your email address.", 400));
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return next(new AppError("Please provide a valid email address.", 400));
  }

  if (email.length > 254) {
    return next(new AppError("Email address is too long.", 400));
  }

  const existingSubscriber = await Newsletter.findOne({ email });

  if (existingSubscriber) {
    if (existingSubscriber.status === "active") {
      return res.status(200).json({
        status: "success",
        message: "You're already subscribed to Kaduna Explorer!",
      });
    }

    existingSubscriber.status = "active";
    existingSubscriber.subscribedAt = new Date();
    existingSubscriber.unsubscribedAt = null;

    await existingSubscriber.save();

    try {
      await sendEmail({
        email,
        subject: "Welcome back to Kaduna Explorer!",
        message:
          "Your Kaduna Explorer newsletter subscription has been reactivated.",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #173225;">
            <h2>Welcome back to Kaduna Explorer!</h2>
            <p>Your newsletter subscription has been reactivated.</p>
            <p>Look out for destination highlights, travel tips and experiences across Kaduna State.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Newsletter welcome email failed:", error.message);
    }

    return res.status(200).json({
      status: "success",
      message: "Your newsletter subscription has been reactivated!",
    });
  }

  let subscriber;

  try {
    subscriber = await Newsletter.create({ email });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({
        status: "success",
        message: "You're already subscribed to Kaduna Explorer!",
      });
    }

    throw error;
  }

  try {
    await sendEmail({
      email,
      subject: "Welcome to Kaduna Explorer!",
      message:
        "Thank you for subscribing to Kaduna Explorer. Stay tuned for destinations, travel tips and experiences across Kaduna State.",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #173225;">
          <h2>Welcome to Kaduna Explorer!</h2>
          <p>Thank you for subscribing to our newsletter.</p>
          <p>Get ready to discover remarkable destinations, travel tips, cultural experiences and hidden gems across Kaduna State.</p>
          <p><strong>Your Kaduna. Your next adventure.</strong></p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Newsletter welcome email failed:", error.message);
  }

  res.status(201).json({
    status: "success",
    message: "Thank you for subscribing to Kaduna Explorer!",
    data: {
      subscriber: {
        id: subscriber._id,
        email: subscriber.email,
        subscribedAt: subscriber.subscribedAt,
      },
    },
  });
});
