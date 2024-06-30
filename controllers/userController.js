const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel")

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: "1d"
    })
}

// Register User 
const registerUser = asyncHandler (async (req,res) => {
    const {name, email, password} = req.body;

    // Validation
    if(!name || !email || !password){
        res.status(400)
        throw new Error("Please fill in all required fields")
    }
    if(password.length < 6){
        res.status(400)
        throw new Error ("Password must be upto 6 characters");
    }
    //  check if user exist
    const userExists = await User.findOne({email })
    if(userExists){
        res.status(400)
        throw new Error ("Email has already been registered");
    }

    // Create new user

    const user = await User.create({
        name,
        email,
        password
    })
    // Generate Token
    const token = generateToken(user._id)

    if(user){
        const { _id , name, email, role} = user
      res.cookie("token", token, {
        path:'/',
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400),
        // secure:true,
        // samesite:none,
      })
    //   Send user data
    res.status(201).json({
        _id,name,email,role,token,
    });
    } else {
        res.status(400);
       throw new Error("Invalid user data")
    }
    res.send("Register User...")
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
  
    // Validate Request
    if (!email || !password) {
      res.status(400);
      throw new Error("Please add email and password");
    }
  
    // Check if user exists
    const user = await User.findOne({ email });
  
    if (!user) {
      res.status(400);
      throw new Error("User not found, please signup");
    }
  
    // User exists, check if password is correct
    const passwordIsCorrect = await bcrypt.compare(password, user.password);
  
    //   Generate Token
    const token = generateToken(user._id);
  
    if (passwordIsCorrect) {
      // Send Login cookie
      res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        // expires: new Date(Date.now() + 1000 * 86400), // 1 day
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "none",
        secure: true,
      });
    }
  
    if (user && passwordIsCorrect) {
      const { _id, name, email, phone, address } = user;
      const newUser = await User.findOne({ email }).select("-password");
  
      res.status(200).json(newUser);
    } else {
      res.status(400);
      throw new Error("Invalid email or password");
    }
  });
  
//   Logout User
const logout = asyncHandler(async (req, res) => {
    res.cookie("token", "", {
      path: "/",
      httpOnly: true,
      expires: new Date(0),
      sameSite: "none",
      secure: true,
    });
    return res.status(200).json({ message: "Successfully Logged Out" });
  });
  
  // Get User Data
  const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password");
  
    if (user) {
      // const { _id, name, email, phone, address } = user;
      res.status(200).json(user);
    } else {
      res.status(400);
      throw new Error("User Not Found");
    }
  });
  
  // Get Login Status
  const getLoginStatus = asyncHandler(async (req, res) => {
    // console.log("getLoginStatus Fired");
    const token = req.cookies.token;
    if (!token) {
      return res.json(false);
    }
    // Verify Token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (verified) {
      return res.json(true);
    }
    return res.json(false);
  });
  
// Update User
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
  
    if (user) {
      const { name, email, phone, address } = user;
      user.name = req.body.name || name;
      user.phone = req.body.phone || phone;
      user.address = req.body.address || address;
  
      const updatedUser = await user.save();
      res.status(200).json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        photo: updatedUser.photo,
        address: updatedUser.address,
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  });
  
  // Update Photo
  const updatePhoto = asyncHandler(async (req, res) => {
    const { photo } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    user.photo = photo;
    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      photo: updatedUser.photo,
      address: updatedUser.address,
    });
  });
  
  // Save Cart
  const saveCart = asyncHandler(async (req,res) => {
    const {cartItems} = req.body
    const user  = await User.findById(req.user._id)

    if(user){
      user.cartItems = cartItems
      user.save()
      res.status(200).json({message:"Cart Saved"})
    }else{
      res.status(404);
      throw new Error("User not found");
    }
  })

  // get cart
  const getCart = asyncHandler(async (req,res) => {
    const user  = await User.findById(req.user._id)

    if(user){
      res.status(200).json(user.cartItems)
    }else{
      res.status(404);
      throw new Error("User not found");
    }
  })

  // Add product to wishlist
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  await User.findOneAndUpdate(
    { email: req.user.email },
    { $addToSet: { wishlist: productId } }
  );

  res.json({ message: "Product added to wishlist" });
});

//
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  await User.findOneAndUpdate(
    { email: req.user.email },
    { $pull: { wishlist: productId } }
  );

  res.json({ message: "Product removed to wishlist" });
});

// Get Wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const list = await User.findOne({ email: req.user.email })
    .select("wishlist")
    .populate("wishlist");

  res.json(list);
});

module.exports = {
    registerUser,
    loginUser,
    logout,
    getUser,
    getLoginStatus,
    updateUser,
    updatePhoto,
    saveCart,
    getCart,
    getWishlist,
    removeFromWishlist,
    addToWishlist,
};