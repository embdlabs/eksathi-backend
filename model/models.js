const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: String,
  email: String,
  contact: Number,
  profile: String,
  password: String,
  address: String,

  cart: {
    type: Array,
    default: null,
  },
  created_on: {
    type: Date,
    default: Date.now,
  },
  updated_on: {
    type: Date,
    default: Date.now,
  },
});
const categorySchema = mongoose.Schema({
  name: String,
  icon: String,
  slug: String,
  seller: Object,
  created_on: {
    type: Date,
    default: Date.now,
  },
  updated_on: {
    type: Date,
    default: Date.now,
  },
});
const productSchema = mongoose.Schema({
  name: String,
  slug: String,
  images: Array,
  desc: String,
  stock: Number,
  specs: Object,
  seller: {
    type: Object,
    default: {
      sellername: "ShopingHighway",
      sellerAddress: "Default Address",
      sellerRating: 5,
    },
  },
  more: {
    type: Object,
    default: { review: null },
  },
  created_on: {
    type: Date,
    default: Date.now,
  },
  updated_on: {
    type: Date,
    default: Date.now,
  },
});

module.exports = {
  USERMODEL: mongoose.model("user", userSchema),
  CATEGMODEL: mongoose.model("category", categorySchema),
  PRODUCTMODEL: mongoose.model("product", productSchema),
};
