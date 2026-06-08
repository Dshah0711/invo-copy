const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate Access Token
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

// Set refresh token in httpOnly cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({ name, email, company: company || '', password });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        logo: user.logo,
        currency: user.currency,
        currencySymbol: user.currencySymbol,
        invoicePrefix: user.invoicePrefix,
        paymentTerms: user.paymentTerms,
        phone: user.phone,
        address: user.address,
        gstNumber: user.gstNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      message: 'Login successful!',
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        logo: user.logo,
        currency: user.currency,
        currencySymbol: user.currencySymbol,
        invoicePrefix: user.invoicePrefix,
        paymentTerms: user.paymentTerms,
        address: user.address,
        phone: user.phone,
        gstNumber: user.gstNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (uses cookie)
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, newRefreshToken);

    res.json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token. Please login again.' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });

    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, company, phone, gstNumber, currency, currencySymbol, invoicePrefix, paymentTerms, address } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
    if (currency) updateData.currency = currency;
    if (currencySymbol) updateData.currencySymbol = currencySymbol;
    if (invoicePrefix) updateData.invoicePrefix = invoicePrefix;
    if (paymentTerms !== undefined) updateData.paymentTerms = Number(paymentTerms);
    if (address) {
      try { updateData.address = typeof address === 'string' ? JSON.parse(address) : address; } catch { updateData.address = address; }
    }
    if (req.file) {
      // Store as a public URL accessible from the client
      updateData.logo = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        logo: user.logo,
        phone: user.phone,
        address: user.address,
        gstNumber: user.gstNumber,
        currency: user.currency,
        currencySymbol: user.currencySymbol,
        invoicePrefix: user.invoicePrefix,
        paymentTerms: user.paymentTerms,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, logout, refresh, getMe, updateProfile };
