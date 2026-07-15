const Joi = require("joi");
const bcrpyt = require("bcrypt");

// ==============Validation Schema's================
const registerSchema = Joi.object({
  first_name: Joi.string()
    .required()
    .messages({ "any.required": "First Name is required" }),
  middle_name: Joi.string().allow(null, ""),
  last_name: Joi.string()
    .required()
    .messages({ "any.required": "Last Name is required" }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({ "any.required": "Email Address is required" }),
  contact: Joi.string()
    .regex(/^[0-9]{10}$/)
    .required("Contact Number is Required")
    .messages({
      "string.pattern.base": `Phone number must have 10 digits.`,
      "any.required": "Contact Number is required",
    }),
  password: Joi.string()
    .min(10)
    .required()
    .messages({ "any.required": "Password is required" }),
  confirm_password: Joi.ref("password"),
});
const loginSchema = Joi.object({
  identifier: Joi.required(),
  password: Joi.string().min(10).required(),
});
const instituteLoginSchema = Joi.object({
  username: Joi.string()
    .regex(/^[a-zA-Z0-9]{6,20}$/)
    .messages({
      "string.pattern.base": `Invalid Username.`,
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .messages({
      "string.pattern.base": `Email should be in correct format.`,
    }),
  phone: Joi.string()
    .regex(/^[0-9]{10}$/)
    .messages({
      "string.pattern.base": `Phone number must have 10 digits.`,
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({ "any.required": "Password is required" }),
})
const categorySchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().required(),
});
const productSchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().required(),
  desc: Joi.string().required(),
  stock: Joi.number().required(),
});
const InstituteRegisterSchema = Joi.object({
  // name: Joi.string().max(25).required(),
  password: Joi.string().min(8).max(16),
  contact_name: Joi.string().max(100),
  contact_email: Joi.string()
    .email({ tlds: { allow: false } }),
  address: Joi.string().max(1000),
  city: Joi.string().max(100),
  state: Joi.string().max(100),
  country: Joi.string().max(100),
  postalCode: Joi.string()
    .regex(/^[0-9]{6}$/)
    .messages({ "string.pattern.base": `Pincode must have 6 digits.` }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  // phone: Joi.string()
  //   .regex(/^[0-9]{10}$/)
  //   .messages({ "string.pattern.base": `Phone number must have 10 digits.` })
  //   .required(),
  // contact_phone: Joi.string()
  //   .regex(/^[0-9]{10}$/)
  //   .messages({ "string.pattern.base": `Phone number must have 10 digits.` })
  //   .required(),
});

const InstitutionRegisterSchema = Joi.object({
  title: Joi.string().max(10).required(),
  first_name: Joi.string().max(100).required(),
  middle_name: Joi.string().min(0).max(100),
  last_name: Joi.string().max(100).required(),
  institute_name: Joi.string().max(200).required(),
  institute_address: Joi.string().max(1000).required(),
  state: Joi.string().max(100).required(),
  pincode: Joi.string()
    .regex(/^[0-9]{6}$/)
    .messages({ "string.pattern.base": `Pincode must have 6 digits.` })
    .required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  confirm_email: Joi.ref("email"),
  contact: Joi.string()
    .regex(/^[0-9]{10}$/)
    .messages({ "string.pattern.base": `Phone number must have 10 digits.` })
    .required(),
});

const CampusRegisterSchema = Joi.object({
  first_name: Joi.string().max(100).required(),
  middle_name: Joi.string().min(0).max(100),
  last_name: Joi.string().max(100).required(),
  institute_name: Joi.string().max(200).required(),
  institute_address: Joi.string().max(1000).required(),
  state: Joi.string().max(100).required(),
  pincode: Joi.string()
    .regex(/^[0-9]{6}$/)
    .messages({ "string.pattern.base": `Pincode must have 6 digits.` })
    .required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  confirm_email: Joi.ref("email"),
  contact: Joi.string()
    .regex(/^[0-9]{10}$/)
    .messages({ "string.pattern.base": `Phone number must have 10 digits.` })
    .required(),
  g20_certification_num: Joi.string().max(500).required(),
  reference: Joi.string().max(500).required(),
  social_active: Joi.string().max(500).required(),
  views_on_g20: Joi.string().max(500).required(),
  topics: Joi.array().items(Joi.string()),
});
// ==============ENd Validation Schema's================

//Hashing Password
async function hashingPassword(pass) {
  const salt = await bcrpyt.genSalt(10);
  return await bcrpyt.hash(pass, salt);
}

// Assuming checkHashedPass function is implemented correctly
async function checkHashedPass(password, hashedPassword) {
    try {
        const match = await bcrpyt.compare(password, hashedPassword);
        return match;
    } catch (error) {
        console.error('Error comparing passwords:', error);
        throw error;
    }
}

module.exports = {
  registerSchema,
  loginSchema,
  hashingPassword,
  checkHashedPass,
  categorySchema,
  productSchema,
  InstitutionRegisterSchema,
  CampusRegisterSchema,
  instituteLoginSchema,
  InstituteRegisterSchema
};