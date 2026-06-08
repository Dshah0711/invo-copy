const Client = require('../models/Client');

const getClients = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { userId: req.user._id };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }
    const clients = await Client.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: clients });
  } catch (error) { next(error); }
};

const getClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, userId: req.user._id });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });
    res.json({ success: true, data: client });
  } catch (error) { next(error); }
};

const createClient = async (req, res, next) => {
  try {
    const { name, email, phone, company, address, gstNumber, currency } = req.body;
    const client = await Client.create({
      userId: req.user._id, name, email, phone, company, address, gstNumber,
      currency: currency || req.user.currency,
    });
    res.status(201).json({ success: true, message: 'Client created!', data: client });
  } catch (error) { next(error); }
};

const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, req.body, { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });
    res.json({ success: true, message: 'Client updated!', data: client });
  } catch (error) { next(error); }
};

const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });
    res.json({ success: true, message: 'Client deleted.' });
  } catch (error) { next(error); }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient };
