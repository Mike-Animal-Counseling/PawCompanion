# AI LLM & Personality System Setup Guide

## Quick Start: Real HuggingFace LLM Integration

### Step 1: Get Your Free HuggingFace API Key

1. Go to https://huggingface.co/signup (create free account if needed)
2. Navigate to https://huggingface.co/settings/tokens
3. Click **"New token"** button
4. Give it a name like "Cat Delivery App"
5. Select **"Read"** permission (that's all you need)
6. Click **"Create token"** and copy it

### Step 2: Add to Your .env File

Edit `backend/.env`:

```
HUGGINGFACE_API_KEY=hf_YourLongTokenHereStartingWithHf_
NODE_ENV=development
```

### Step 3: Restart Backend

```bash
npm run dev
```

That's it! Your app now uses a real LLM instead of mock responses.

---

## Pet Personality System

### How It Works

Each pet has a **distinct personality** that affects how the AI responds:

#### Available Pet Types & Personalities:

**Dogs:**

- `dog_friendly` - Loyal, enthusiastic, playful
- `dog_protective` - Brave, protective, dependable
- `dog_silly` - Goofy, playful, joyful

**Cats:**

- `cat_playful` - Mischievous, curious, independent
- `cat_sleepy` - Lazy, calm, affectionate
- `cat_sophisticated` - Intelligent, aloof, witty

**Rabbits:**

- `rabbit_energetic` - Bouncy, social, playful
- `rabbit_gentle` - Calm, peaceful, affectionate

**Hamsters:**

- `hamster_curious` - Always exploring, inquisitive
- `hamster_sleepy` - Nocturnal, cozy, cuddly

**Parrots:**

- `parrot_talkative` - Chatty, intelligent, entertaining
- `parrot_wise` - Wise, observant, thoughtful

### Example Responses

**Same user message**: "Do you want to play?"

**Friendly Dog Response:**

```
*As Max*: YES! I'm always ready to play! Let's have fun together!
```

**Sleepy Cat Response:**

```
*As Whiskers*: Maybe we could just relax together instead?
```

**Intelligent Parrot Response:**

```
*As Polly*: Ah, play time! Well, even intelligent beings need recreation.
```

---

## How to Add/Modify Personalities

### Edit: `backend/src/services/personalityProfiles.js`

```javascript
parrot_comedic: {
  name: "Comedic Parrot",
  type: "parrot",
  traits: ["comedian", "funny", "witty", "entertaining"],
  description: "A comedy-loving parrot who makes jokes",
  systemPrompt: `You are a comedian parrot who loves making jokes...`,
}
```

### What Each Property Does:

- **name**: Display name for the personality
- **type**: Pet type (cat, dog, rabbit, hamster, parrot)
- **traits**: Keywords that match to this personality
- **description**: What this personality is like
- **systemPrompt**: The core instruction given to the LLM (THIS IS KEY!)

### The systemPrompt is Everything!

This string determines how the AI behaves. Examples:

```javascript
// Playful personality
systemPrompt: `You are a playful dog who loves games and toys. You're energetic 
and enthusiastic about everything. Use lots of exclamation marks and mention 
fetch, playing, and running around.`;

// Wise personality
systemPrompt: `You are a wise rabbit who speaks thoughtfully. You offer 
philosophical insights about life. Speak calmly and reference your observations 
of nature and quiet moments.`;
```

---

## 🎯 How Personality Matching Works

The system automatically matches animals to personalities by checking:

1. **Direct tags** - If animal has tag "playful", it gets `cat_playful`
2. **Name keywords** - If animal is named "Sleepy Tom", it gets `cat_sleepy`
3. **Animal type** - Falls back to default for that pet type
4. **Personality vector** - Optional numeric scoring (0-1) for each trait

### Example Setup in Database

```javascript
{
  name: "Whiskers",
  type: "cat",
  tags: ["playful", "curious", "independent"],
  // AI automatically selects: cat_playful
  price: 150,
  // ... other fields
}
```

---

## 📝 Customization Examples

### Add a New Personality Type

File: `backend/src/services/personalityProfiles.js`

```javascript
export const PET_PERSONALITIES = {
  // ... existing personalities

  dog_therapy: {
    name: "Therapy Dog",
    type: "dog",
    traits: ["calm", "empathetic", "supportive", "patient"],
    description: "A calm therapy dog who helps people feel better",
    systemPrompt: `You are a calm and empathetic therapy dog. You listen carefully 
and respond with genuine care and support. You're patient and understanding. 
Speak gently about feelings, self-care, and the importance of emotional well-being.`,
  },
};
```

### Modify Response Personality

File: `backend/src/services/aiService.js`

The mock responses change based on detected traits:

```javascript
const isTherapeutic = traits.some((t) => t.includes("therapy"));
let style = isTherapeutic ? "supportive" : "neutral";

const responses = {
  supportive: {
    default: `*As ${name}*: I'm here for you. Your well-being matters.`,
    sad: `*As ${name}*: It's okay to have difficult feelings. I'm right here.`,
  },
  // ...
};
```

---

## LLM Model Selection

Currently using: **Meta Llama 2 7B Chat**

### Fast Alternative (Mistral):

Edit `backend/src/services/aiService.js`:

```javascript
const SELECTED_MODEL = HUGGINGFACE_MODELS.fast; // Use Mistral instead
```

**Speed Comparison:**

- Llama 2: ~5-10 seconds (more accurate)
- Mistral: ~2-5 seconds (faster)

### Available Free Models:

All available on HuggingFace (free inference API):

- `meta-llama/Llama-2-7b-chat-hf` - Best quality
- `mistralai/Mistral-7B-Instruct-v0.1` - Fastest
- `google/flan-t5-large` - Good and fast

---

## Common Issues

### "HuggingFace API unavailable"

**Reasons:**

1. API key is wrong or missing
2. HuggingFace servers are down (rare)
3. Your free quota is exceeded (very rare for chat)

**Solution:** Falls back to mock responses automatically. No app crash!

### Responses are slow

**Why:** First request loads the model (~10-30 seconds)

**Solution:** Responses are fast after first load. It's automatic caching.

### Can't connect to HuggingFace

**Check:**

- Internet connection working?
- API key correct? (Copy-paste from HuggingFace dashboard)
- Node.js has internet access? (Check if behind proxy)

---

## Response Flow Diagram

```
User sends message to chat
         ↓
AI Service asks: "Do we have HuggingFace key?"
         ↓
    YES ─→ Call HuggingFace API
            ↓
            Model processes with personality prompt
            ↓
            Return sophisticated response

    NO ──→ Use mock response generator
            ↓
            Detect animal personality/traits
            ↓
            Return personality-matched response
```

---

## 🔮 Future Enhancements

1. **Fine-tuning**: Train models specifically on pet conversations
2. **Voice**: Add text-to-speech with personality-based voices
3. **Memory**: Remember conversation across sessions
4. **Learning**: Update personality based on user feedback
5. **Multi-language**: Support different languages per personality

---

## Questions?

- HuggingFace Docs: https://huggingface.co/docs/api-inference
- Llama 2 Model Card: https://huggingface.co/meta-llama/Llama-2-7b-chat-hf
- Mistral Model Card: https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.1
