import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema(
  {
    actorId: { type: String, default: '' },
    actorRole: { type: String, enum: ['customer', 'merchant', 'admin', 'system'], default: 'system' },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: '', index: true },
    targetId: { type: String, default: '', index: true },
    metadata: { type: Object, default: {} },
    ipHash: { type: String, default: '' },
  },
  { timestamps: true },
);

auditEventSchema.index({ createdAt: -1 });

export const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
export default AuditEvent;
