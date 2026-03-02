import "dotenv/config.js";
import connectDB, { disconnectDB } from "./config/db.js";
import Animal from "./models/Animal.js";

/**
 * Sample animal data for seeding the database
 * This data will only be inserted if the collection is empty
 * (Never deletes or drops existing data)
 */
const seedAnimals = [
  {
    name: "western Dog",
    price: 10,
    favorite: true,
    origins: ["Unknown", "Italy"],
    stars: 2.5,
    imageUrl: "dog1.jpg",
    personality:
      "Love to eat. Happy to sleep with person and they play with person.",
    tags: ["United States"],
  },
  {
    name: "Eastern Dog",
    price: 60,
    favorite: false,
    origins: ["Unknown"],
    stars: 5,
    imageUrl: "dog2.jpg",
    personality:
      "Love people. Love kids and they are very cute when they play the game.",
    tags: ["China"],
  },
  {
    name: "Sourth Dog",
    price: 3,
    favorite: true,
    origins: ["Unknown"],
    stars: 2,
    imageUrl: "dog3.jpg",
    personality:
      "Sleep all the day but smells very good and they can walk very quick.",
    tags: ["China"],
  },
  {
    name: "North Dog",
    price: 60,
    favorite: false,
    origins: ["Unknown"],
    stars: 3.5,
    imageUrl: "dog4.jpg",
    personality: "Happy all the day and have energy all the day.",
    tags: ["China"],
  },
  {
    name: "Hello Dog",
    price: 30,
    favorite: false,
    origins: ["Unknown"],
    stars: 3.5,
    imageUrl: "dog5.jpg",
    personality: "It can receive the order by the person.",
    tags: ["Canada"],
  },
  {
    name: "Huge Dog",
    price: 20,
    favorite: false,
    origins: ["Unknown"],
    stars: 5,
    imageUrl: "dog6.jpg",
    personality: "There is nothing about this pet~",
    tags: ["Canada"],
  },
  {
    name: "Amazing Dog",
    price: 30,
    favorite: false,
    origins: ["Unknown"],
    stars: 2,
    imageUrl: "dog7.jpg",
    personality: "There is nothing about this pet~",
    tags: ["India"],
  },
  {
    name: "Western Cat",
    price: 60,
    favorite: false,
    origins: ["Unknown"],
    stars: 3,
    imageUrl: "cat1.jpg",
    personality: "There is nothing about this pet~",
    tags: ["India"],
  },
  {
    name: "Eastern Cat",
    price: 70,
    favorite: false,
    origins: ["Unknown"],
    stars: 3,
    imageUrl: "cat2.jpg",
    personality: "There is nothing about this pet~",
    tags: ["China"],
  },
  {
    name: "Sourth Cat",
    price: 60,
    favorite: false,
    origins: ["Unknown"],
    stars: 5,
    imageUrl: "cat3.jpg",
    personality: "There is nothing about this pet~",
    tags: ["China"],
  },
  {
    name: "Northern Cat",
    price: 70,
    favorite: true,
    origins: ["Unknown"],
    stars: 5,
    imageUrl: "cat4.jpg",
    personality: "There is nothing about this pet~",
    tags: ["Europe"],
  },
  {
    name: "Hello Cat",
    price: 70,
    favorite: false,
    origins: ["Unknown"],
    stars: 3.5,
    imageUrl: "cat5.jpg",
    personality: "There is nothing about this pet~",
    tags: ["Europe"],
  },
  {
    name: "Huge Cat",
    price: 60,
    favorite: false,
    origins: ["Unknown"],
    stars: 2.5,
    imageUrl: "cat6.jpg",
    personality: "There is nothing about this pet~",
    tags: ["Europe"],
  },
  {
    name: "Amazing Cat",
    price: 70,
    favorite: false,
    origins: ["Unknown"],
    stars: 3,
    imageUrl: "cat7.jpg",
    personality: "There is nothing about this pet~",
    tags: ["United States"],
  },
];

/**
 * Seed the database with sample animals
 * IMPORTANT: Only inserts if collection is empty. Never deletes existing data.
 */
async function seed() {
  try {
    await connectDB();

    // Check if collection already has data
    const count = await Animal.countDocuments();
    if (count > 0) {
      console.log(
        `Database already seeded with ${count} animals. Skipping seed.`,
      );
      await disconnectDB();
      return;
    }

    console.log("Seeding database with sample animals...");
    const result = await Animal.insertMany(seedAnimals);
    console.log(
      `Successfully seeded ${result.length} animals into the database`,
    );

    await disconnectDB();
    console.log("Seeding complete");
  } catch (error) {
    console.error("Error seeding database:", error.message);
    process.exit(1);
  }
}

seed();
