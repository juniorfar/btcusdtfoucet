import mongoose, { Schema, Document } from 'mongoose';

export interface IGameSession extends Document {
  userId: mongoose.Types.ObjectId;
  scoreGained: number;
  satsMined: number;
  levelAchieved: number;
  movesInSession: number;
  createdAt: Date;
}

const GameSessionSchema: Schema<IGameSession> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scoreGained: {
      type: Number,
      required: true,
      min: 0,
    },
    satsMined: {
      type: Number,
      required: true,
      min: 0,
    },
    levelAchieved: {
      type: Number,
      required: true,
      default: 1,
    },
    movesInSession: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const GameSession = mongoose.model<IGameSession>('GameSession', GameSessionSchema);
