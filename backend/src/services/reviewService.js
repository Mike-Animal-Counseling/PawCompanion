import Animal from '../models/Animal.js';
import Booking from '../models/Booking.js';
import Merchant from '../models/Merchant.js';
import Review from '../models/Review.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { recordAudit } from '../services/auditService.js';

export async function recomputeAnimalRating(animalId) {
  const [stats] = await Review.aggregate([
    { $match: { animalId, status: 'published' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Animal.updateOne(
    { _id: animalId },
    {
      $set: {
        ratingAverage: stats ? Math.round(stats.average * 10) / 10 : 0,
        reviewCount: stats?.count || 0,
      },
    },
  );
}

export async function recomputeMerchantRating(merchantId) {
  const [stats] = await Review.aggregate([
    { $match: { merchantId, status: 'published' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Merchant.updateOne(
    { _id: merchantId },
    {
      $set: {
        ratingAverage: stats ? Math.round(stats.average * 10) / 10 : 0,
        reviewCount: stats?.count || 0,
      },
    },
  );
}

export async function createReview({ bookingId, customerId, input, req }) {
  const booking = await Booking.findOne({ _id: bookingId, customerId });
  if (!booking) throw notFound('Booking not found');
  if (booking.status !== 'completed') throw conflict('You can review a visit after it is completed');
  if (booking.reviewId) throw conflict('You already reviewed this visit');

  let review;
  try {
    review = await Review.create({
      bookingId: booking._id,
      customerId,
      animalId: booking.animalId,
      merchantId: booking.merchantId,
      rating: input.rating,
      title: input.title || '',
      body: input.body || '',
    });
  } catch (error) {
    if (error?.code === 11000) throw conflict('You already reviewed this visit');
    throw error;
  }

  booking.reviewId = review._id;
  await booking.save();
  await Promise.all([recomputeAnimalRating(booking.animalId), recomputeMerchantRating(booking.merchantId)]);
  await recordAudit(req, {
    action: 'review.created',
    targetType: 'review',
    targetId: review._id,
    metadata: { bookingId: String(booking._id), rating: review.rating },
  });
  return review;
}

export async function listAnimalReviews({ animalId, page, pageSize, rating }) {
  const filter = { animalId, status: 'published', ...(rating ? { rating } : {}) };
  const [total, items] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .populate('customerId', 'name avatarColor')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
  ]);
  return { total, items };
}

export async function replyToReview({ reviewId, merchantId, body, req }) {
  const review = await Review.findOne({ _id: reviewId, merchantId });
  if (!review) throw notFound('Review not found');
  review.merchantReply = { body, at: new Date() };
  await review.save();
  await recordAudit(req, { action: 'review.replied', targetType: 'review', targetId: review._id });
  return review;
}

export async function setReviewVisibility({ reviewId, status, req }) {
  const review = await Review.findById(reviewId);
  if (!review) throw notFound('Review not found');
  review.status = status;
  await review.save();
  await Promise.all([recomputeAnimalRating(review.animalId), recomputeMerchantRating(review.merchantId)]);
  await recordAudit(req, {
    action: `review.${status}`,
    targetType: 'review',
    targetId: review._id,
    metadata: { rating: review.rating },
  });
  return review;
}

export async function merchantRatingFor(merchantId) {
  const [stats] = await Review.aggregate([
    { $match: { merchantId, status: 'published' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return { average: stats ? Math.round(stats.average * 10) / 10 : 0, count: stats?.count || 0 };
}

export async function assertReviewOwner(reviewId, customerId) {
  const review = await Review.findOne({ _id: reviewId, customerId });
  if (!review) throw forbidden();
  return review;
}
