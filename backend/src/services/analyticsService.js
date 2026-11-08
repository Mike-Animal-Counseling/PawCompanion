import mongoose from 'mongoose';
import Animal from '../models/Animal.js';
import AuditEvent from '../models/AuditEvent.js';
import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import Merchant from '../models/Merchant.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import UserRiskProfile from '../models/UserRiskProfile.js';
import { localDateString } from '../lib/time.js';

function startOfWindow(days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

function fillSeries(rows, days) {
  const map = new Map(rows.map((row) => [row._id, row]));
  const output = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const row = map.get(key);
    output.push({ date: key, value: row?.value || 0, count: row?.count || 0 });
  }
  return output;
}

export async function merchantOverview(merchantId, days = 30) {
  const start = startOfWindow(days);
  const today = localDateString();
  const merchantObjectId = new mongoose.Types.ObjectId(String(merchantId));

  const [
    bookingStats,
    revenueSeries,
    upcoming,
    topAnimals,
    recentReviews,
    repeatCustomers,
    customerCount,
    listingCount,
    activeListingCount,
    rating,
    channelRows,
  ] = await Promise.all([
    Booking.aggregate([
      { $match: { merchantId: merchantObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          subtotal: { $sum: '$pricing.subtotal' },
          fees: { $sum: '$pricing.serviceFee' },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { merchantId: merchantObjectId, createdAt: { $gte: start }, status: { $nin: ['cancelled', 'declined'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          value: { $sum: '$pricing.subtotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Booking.find({ merchantId, date: { $gte: today }, status: { $in: ['pending', 'confirmed'] } })
      .populate('animalId', 'name imageUrl')
      .populate('customerId', 'name')
      .sort({ date: 1, startTime: 1 })
      .limit(6)
      .lean(),
    Booking.aggregate([
      { $match: { merchantId: merchantObjectId, status: { $nin: ['cancelled', 'declined'] } } },
      { $group: { _id: '$animalId', bookings: { $sum: 1 }, revenue: { $sum: '$pricing.subtotal' } } },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'animals', localField: '_id', foreignField: '_id', as: 'animal' } },
      { $unwind: { path: '$animal', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          animalId: '$_id',
          name: '$animal.name',
          imageUrl: '$animal.imageUrl',
          bookings: 1,
          revenue: 1,
        },
      },
    ]),
    Review.find({ merchantId, status: 'published' })
      .populate('customerId', 'name avatarColor')
      .populate('animalId', 'name')
      .sort({ createdAt: -1 })
      .limit(4)
      .lean(),
    Booking.aggregate([
      { $match: { merchantId: merchantObjectId, status: { $nin: ['cancelled', 'declined'] } } },
      { $group: { _id: '$customerId', visits: { $sum: 1 } } },
      { $match: { visits: { $gt: 1 } } },
      { $count: 'repeat' },
    ]),
    Booking.distinct('customerId', { merchantId }),
    Animal.countDocuments({ merchantId }),
    Animal.countDocuments({ merchantId, isActive: true, visibility: 'public' }),
    Review.aggregate([
      { $match: { merchantId: merchantObjectId, status: 'published' } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { merchantId: merchantObjectId, status: { $nin: ['cancelled', 'declined'] } } },
      {
        $group: {
          _id: { $ifNull: ['$service.mode', 'in_person'] },
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.subtotal' },
        },
      },
    ]),
  ]);

  const byStatus = Object.fromEntries(bookingStats.map((row) => [row._id, row]));
  const revenue = bookingStats
    .filter((row) => !['cancelled', 'declined'].includes(row._id))
    .reduce((sum, row) => sum + row.subtotal, 0);
  const fees = bookingStats
    .filter((row) => !['cancelled', 'declined'].includes(row._id))
    .reduce((sum, row) => sum + row.fees, 0);

  return {
    windowDays: days,
    revenue: Math.round(revenue * 100) / 100,
    platformFees: Math.round(fees * 100) / 100,
    netRevenue: Math.round((revenue - fees) * 100) / 100,
    bookings: {
      pending: byStatus.pending?.count || 0,
      confirmed: byStatus.confirmed?.count || 0,
      completed: byStatus.completed?.count || 0,
      cancelled: (byStatus.cancelled?.count || 0) + (byStatus.declined?.count || 0),
      total: bookingStats.reduce((sum, row) => sum + row.count, 0),
    },
    customers: {
      total: customerCount.length,
      repeat: repeatCustomers[0]?.repeat || 0,
    },
    listings: { total: listingCount, active: activeListingCount },
    rating: { average: rating[0] ? Math.round(rating[0].average * 10) / 10 : 0, count: rating[0]?.count || 0 },
    channels: {
      online: channelRows.find((row) => row._id === 'online') || { bookings: 0, revenue: 0 },
      in_person: channelRows.find((row) => row._id === 'in_person') || { bookings: 0, revenue: 0 },
    },
    series: fillSeries(revenueSeries, days),
    upcoming: upcoming.map((booking) => ({
      id: String(booking._id),
      date: booking.date,
      startTime: booking.startTime,
      status: booking.status,
      animal: booking.animalId ? { name: booking.animalId.name, imageUrl: booking.animalId.imageUrl } : null,
      customer: booking.customerId ? { name: booking.customerId.name } : null,
      total: booking.pricing?.total || 0,
    })),
    topAnimals,
    recentReviews,
  };
}

export async function platformOverview(days = 30) {
  const start = startOfWindow(days);

  const [
    customers,
    newCustomers,
    merchants,
    activeMerchants,
    animals,
    hiddenAnimals,
    bookings,
    activeBookings,
    gmv,
    riskStatuses,
    signupSeries,
    recentAudit,
    recentBookings,
    reviews,
  ] = await Promise.all([
    Customer.countDocuments(),
    Customer.countDocuments({ createdAt: { $gte: start } }),
    Merchant.countDocuments(),
    Merchant.countDocuments({ status: 'active' }),
    Animal.countDocuments({ isActive: true }),
    Animal.countDocuments({ moderationStatus: 'hidden' }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
    Payment.aggregate([{ $match: { status: 'succeeded' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    UserRiskProfile.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Customer.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, value: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AuditEvent.find().sort({ createdAt: -1 }).limit(8).lean(),
    Booking.find().populate('animalId', 'name imageUrl').populate('customerId', 'name').populate('merchantId', 'name').sort({ createdAt: -1 }).limit(6).lean(),
    Review.countDocuments({ status: 'published' }),
  ]);

  return {
    windowDays: days,
    customers: { total: customers, new: newCustomers },
    merchants: { total: merchants, active: activeMerchants },
    animals: { total: animals, hidden: hiddenAnimals },
    bookings: { total: bookings, active: activeBookings },
    gmv: Math.round((gmv[0]?.total || 0) * 100) / 100,
    reviews,
    risk: Object.fromEntries(['ok', 'watch', 'flagged'].map((status) => [status, riskStatuses.find((row) => row._id === status)?.count || 0])),
    series: fillSeries(signupSeries, days),
    recentAudit,
    recentBookings,
  };
}
