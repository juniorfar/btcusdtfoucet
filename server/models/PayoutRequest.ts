import mongoose, { Schema, Document } from 'mongoose';

export interface IPayoutRequest extends Document {
  userId: mongoose.Types.ObjectId;
  amountSats?: number;
  amountUsdt?: number;
  provider: 'faucetpay' | 'cwallet';
  currency: 'BTC' | 'USDT';
  withdrawValueUsd: number;
  receiveAmount: string;
  walletAddress: string;
  status: 'pending' | 'completed' | 'rejected' | 'failed';
  txHash?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutRequestSchema: Schema<IPayoutRequest> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amountSats: {
      type: Number,
      default: 0,
    },
    amountUsdt: {
      type: Number,
      default: 0,
    },
    provider: {
      type: String,
      enum: ['faucetpay', 'cwallet'],
      default: 'faucetpay',
    },
    currency: {
      type: String,
      enum: ['BTC', 'USDT'],
      default: 'BTC',
    },
    withdrawValueUsd: {
      type: Number,
      default: 0,
    },
    receiveAmount: {
      type: String,
      default: '',
    },
    walletAddress: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'rejected', 'failed'],
      default: 'completed',
    },
    txHash: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const PayoutRequest = mongoose.model<IPayoutRequest>('PayoutRequest', PayoutRequestSchema);
