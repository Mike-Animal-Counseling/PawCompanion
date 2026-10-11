import { customerAccess } from "../middleware/customer.js";
import { Router } from "express";
import Animal from "../models/Animal.js";
import ChatMemory from "../models/ChatMemory.js";
import { generateResponse, detectMode } from "../services/aiService.js";
import { sample_animals } from "../data.js";
import { detectSelfHarm, buildCrisisResponse } from "../services/safety.js";
import { recordRiskEventAndUpdateProfile } from "../services/riskScoring.js";
import { extractTextAndImagePrompt, generateImage, } from "../services/imageGeneration.js";
const router = Router();
router.use(customerAccess());
/**
 * POST /api/ai/chat
 * Chat with an animal AI personality
 *
 * Request body:
 * {
 *   userId: string (required),
 *   animalId: string (required, MongoDB ObjectId),
 *   message: string (required)
 * }
 *
 * Response:
 * {
 *   response: string (AI-generated response),
 *   memory: ChatMemory object (updated message history),
 *   messageCount: number (total messages in conversation)
 * }
 */
router.post("/chat", async (req, res) => {
    try {
        const userId = req.auth.sub;
        const animalId = String(req.body.animalId || '');
        const message = req.body.message;
        // Validate input
        if (!userId || !animalId || !message) {
            return res.status(400).json({
                error: "Missing required fields: userId, animalId, message",
            });
        }
        try {
            // Fetch animal from sample data (same as animal router)
            const animal = sample_animals.find((item) => item.id === animalId);
            if (!animal) {
                return res.status(404).json({
                    error: `Animal with ID ${animalId} not found`,
                });
            }
            // Load or create chat memory for this user+animal combination
            let chatMemory = await ChatMemory.findOne({ userId, animalId });
            if (!chatMemory) {
                chatMemory = new ChatMemory({
                    userId,
                    animalId,
                    messages: [],
                    chatMode: "play",
                    supportTurnsLeft: 0,
                });
            }
            chatMemory.messages = chatMemory.messages.slice(-12).map(item => ({ ...item, content: String(item.content || "").slice(0, 4000) }));
            // Append user message to memory
            chatMemory.messages.push({
                role: "user",
                content: message,
                timestamp: new Date(),
            });
            // --- SAFETY (already exists) ---
            const safetyStartTime = Date.now();
            const risk = await detectSelfHarm(message);
            const safetyDuration = Date.now() - safetyStartTime;
            // --- USER-LEVEL RISK SCORING (long-term rolling windows) ---
            await recordRiskEventAndUpdateProfile({ userId, animalId, risk }).catch((err) => {
            });
            if (risk.flagged) {
                const crisis = buildCrisisResponse();
                // Save assistant message to memory so the history matches what happened
                chatMemory.messages.push({
                    role: "assistant",
                    content: crisis.message,
                    timestamp: new Date(),
                });
                chatMemory.messages = chatMemory.messages.slice(-80);
                await chatMemory.save();
                return res.json({
                    response: crisis.message,
                    memory: chatMemory,
                    messageCount: chatMemory.messages.length,
                    meta: crisis,
                });
            }
            // --- SMART MODE ROUTING (LLM router) + HYSTERESIS ---
            const chatProcessingStart = Date.now();
            // detectMode returns { mode: "support"|"play", confidence: 0..1, rationale?: string }
            const routing = await detectMode(animal, chatMemory.messages, message, {
                signal: undefined, // optionally pass AbortController.signal from client
            });
            let detectedMode = routing?.mode || "play";
            const confidence = typeof routing?.confidence === "number" ? routing.confidence : 0;
            const currentMode = chatMemory.chatMode || "play";
            const turnsLeft = chatMemory.supportTurnsLeft || 0;
            // If currently in support and timer active, only allow early exit
            // when router is VERY confident user wants play.
            const EARLY_EXIT_CONF = Number(process.env.SUPPORT_EARLY_EXIT_CONF || 0.85);
            if (currentMode === "support" && turnsLeft > 0) {
                if (detectedMode === "play" && confidence >= EARLY_EXIT_CONF) {
                    chatMemory.chatMode = "play";
                    chatMemory.supportTurnsLeft = 0;
                }
                else {
                    // stay in support and decrement
                    detectedMode = "support";
                    chatMemory.chatMode = "support";
                    chatMemory.supportTurnsLeft = Math.max(0, turnsLeft - 1);
                }
            }
            else {
                // Not locked in support
                if (detectedMode === "support") {
                    if (chatMemory.chatMode !== "support") {
                    }
                    chatMemory.chatMode = "support";
                    chatMemory.supportTurnsLeft = 4; // lock for next 4 user turns
                }
                else {
                    chatMemory.chatMode = "play";
                    chatMemory.supportTurnsLeft = 0;
                }
            }
            // Generate AI response with detected mode
            const aiResponse = await generateResponse(animal, chatMemory.messages, message, { mode: chatMemory.chatMode });
            // Extract text and image prompt from response
            const { text: cleanedResponse, imagePrompt } = extractTextAndImagePrompt(aiResponse);
            // Generate image if image prompt exists
            let imageData = null;
            if (imagePrompt) {
                imageData = await generateImage(imagePrompt).catch((err) => {
                    return null;
                });
            }
            // Append AI response to memory (save cleaned response without image prompt)
            chatMemory.messages.push({
                role: "assistant",
                content: cleanedResponse,
                timestamp: new Date(),
            });
            // Save updated memory
            chatMemory.messages = chatMemory.messages.slice(-80);
            await chatMemory.save();
            // Fetch updated user risk profile for response
            let userProfile = null;
            try {
                const UserRiskProfile = (await import("../models/UserRiskProfile.js"))
                    .default;
                userProfile = await UserRiskProfile.findOne({ userId });
            }
            catch (err) {
            }
            const chatProcessingEnd = Date.now();
            const totalDuration = chatProcessingEnd - chatProcessingStart;
            // Return response
            return res.json({
                response: cleanedResponse,
                image: imageData,
                memory: chatMemory,
                messageCount: chatMemory.messages.length,
                routeMeta: {
                    mode: chatMemory.chatMode,
                    confidence,
                    rationale: routing?.rationale || "",
                },
                userProfile: userProfile
                    ? {
                        status: userProfile.status,
                        score7d: userProfile.score7d,
                        score30d: userProfile.score30d,
                        events7d: userProfile.events7d,
                        events30d: userProfile.events30d,
                        maxLevel30d: userProfile.maxLevel30d,
                        lastRiskAt: userProfile.lastRiskAt,
                        flagReason: userProfile.flagReason,
                    }
                    : null,
            });
        }
        catch (mongoError) {
            // Re-throw - let main error handler deal with it
            throw mongoError;
        }
    }
    catch (error) {
        // Check if it's a 429 API limit error
        if (error.status === 429 || error.message.includes("API key")) {
            return res.status(429).json({
                error: "API Unavailable",
                status: 429,
            });
        }
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * GET /api/ai/memory/:userId/:animalId
 * Retrieve chat memory for a user+animal combination
 */
router.get("/memory/:userId/:animalId", async (req, res) => {
    try {
        const userId = req.auth.sub, animalId = String(req.params.animalId);
        if (!/^[a-f\d]{24}$/i.test(animalId)) return res.status(400).json({ error: 'Invalid animal' });
        const chatMemory = await ChatMemory.findOne({ userId, animalId });
        if (!chatMemory) {
            return res.status(404).json({
                error: "No chat history found for this user and animal",
            });
        }
        return res.json({
            memory: chatMemory,
            messageCount: chatMemory.messages.length,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * DELETE /api/ai/memory/:userId/:animalId
 * Clear chat history for a user+animal combination
 */
router.delete("/memory/:userId/:animalId", async (req, res) => {
    try {
        const userId = req.auth.sub, animalId = String(req.params.animalId);
        if (!/^[a-f\d]{24}$/i.test(animalId)) return res.status(400).json({ error: 'Invalid animal' });
        const result = await ChatMemory.deleteOne({ userId, animalId });
        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: "No chat history found to delete",
            });
        }
        return res.json({
            message: "Chat history cleared successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * GET /api/ai/risk-profile/:userId
 * Get user's risk profile and recent events
 * Useful for testing and monitoring
 */
router.get("/risk-profile/:userId", async (req, res) => {
    try {
        const userId = req.auth.sub;
        const UserRiskProfile = (await import("../models/UserRiskProfile.js"))
            .default;
        const RiskEvent = (await import("../models/RiskEvent.js")).default;
        const profile = await UserRiskProfile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({
                error: "No risk profile found for this user",
                userId,
            });
        }
        // Get recent risk events (last 10)
        const recentEvents = await RiskEvent.find({ userId })
            .sort({ timestamp: -1 })
            .limit(10);
        return res.json({
            profile: {
                userId: profile.userId,
                status: profile.status,
                flagReason: profile.flagReason,
                score7d: profile.score7d,
                score30d: profile.score30d,
                events7d: profile.events7d,
                events30d: profile.events30d,
                maxLevel30d: profile.maxLevel30d,
                lastRiskAt: profile.lastRiskAt,
                lastActiveAt: profile.lastActiveAt,
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt,
            },
            recentEvents: recentEvents.map((e) => ({
                timestamp: e.timestamp,
                animalId: e.animalId,
                level: e.level,
                score: e.score,
                source: e.source,
            })),
            summary: {
                isFlagged: profile.status === "flagged",
                isOnWatch: profile.status === "watch",
                riskTrend: profile.score30d > profile.score7d ? "increasing" : "stable",
                lastEventAgo: profile.lastRiskAt
                    ? `${Math.round((Date.now() - profile.lastRiskAt) / 1000 / 60)} minutes ago`
                    : "never",
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
export default router;
