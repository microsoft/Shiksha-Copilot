require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const ObjectId = mongoose.Types.ObjectId;
const JWT_SECRET = process.env.JWT_SECRET;

const classSchema = new mongoose.Schema({
  board: {
    type: String,
    required: true,
  },
  class: {
    type: Number,
    required: true,
  },
  medium: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sem: {
    type: Number,
    required: true,
  },
});

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    zone: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    block: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    role: [
      {
        type: String,
        enum: ["power", "standard"],
        required: true,
      },
    ],
    school: {
      type: ObjectId,
      ref: "School",
      required: true,
    },
    preferredLanguage: {
      type: String,
      enum: ["en", "kn"],
      default: "en",
    },
    facilities: [],
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    classes: {
      type: [classSchema],
    },
    profileImage: {
      type: String,
      default: "",
    },
    profileImageExpiresIn: {
      type: Number,
      default: parseInt(Date.now() / 1000),
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    rememberMeToken: {
      type: Boolean,
      default: false,
    },
    isLoginAllowed: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, isAdmin: false, isDeleted: this.isDeleted },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
  return token;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
