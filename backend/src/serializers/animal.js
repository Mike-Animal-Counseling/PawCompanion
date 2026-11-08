import { toId } from '../lib/ids.js';
import { getDigitalProfile } from '../services/digitalPetService.js';
import { serializeMerchantPublic } from './account.js';

export function ageLabel(months) {
  const value = Number(months) || 0;
  if (value < 12) return `${value} mo`;
  const years = Math.floor(value / 12);
  return `${years} yr${years === 1 ? '' : 's'}`;
}

export function serializeAnimal(animal, { isFavorite = false } = {}) {
  const merchant = animal.merchantId && animal.merchantId.name ? animal.merchantId : null;
  const digital = getDigitalProfile(animal);
  return {
    id: toId(animal),
    name: animal.name,
    species: animal.species,
    breed: animal.breed || '',
    ageMonths: animal.ageMonths,
    ageLabel: ageLabel(animal.ageMonths),
    gender: animal.gender,
    size: animal.size,
    price: animal.price,
    description: animal.description || '',
    personality: animal.personality || '',
    tags: animal.tags || [],
    imageUrl: animal.imageUrl || '',
    gallery: animal.gallery || [],
    city: animal.city || '',
    region: animal.region || '',
    energyLevel: animal.energyLevel,
    goodWithKids: Boolean(animal.goodWithKids),
    goodWithPets: Boolean(animal.goodWithPets),
    vaccinated: Boolean(animal.vaccinated),
    neutered: Boolean(animal.neutered),
    ratingAverage: animal.ratingAverage || 0,
    reviewCount: animal.reviewCount || 0,
    bookingCount: animal.bookingCount || 0,
    featured: Boolean(animal.featured),
    isFavorite: Boolean(isFavorite),
    digital: {
      enabled: digital.enabled,
      voice: digital.voice,
      traits: digital.traits,
      routines: digital.routines,
      favorites: digital.favorites,
      comforts: digital.comforts,
      boundaries: digital.boundaries,
      voiceStyle: digital.voiceStyle,
    },
    merchant: serializeMerchantPublic(merchant),
    createdAt: animal.createdAt,
  };
}

export function serializeAnimalSummary(animal) {
  if (!animal) return null;
  return {
    id: toId(animal),
    name: animal.name,
    imageUrl: animal.imageUrl || '',
    species: animal.species || '',
    breed: animal.breed || '',
    price: animal.price,
    city: animal.city || '',
  };
}
