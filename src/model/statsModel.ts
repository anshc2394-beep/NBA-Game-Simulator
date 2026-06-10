import { Team } from '../team';

export interface Prediction {
    teamAWinProbability: number;
    expectedScoreA: number;
    expectedScoreB: number;
}

export interface ModelWeights {
    ratingDiffWeight: number;
    bias: number;
}

export class StatsModel {
    private weights: ModelWeights;
    private learningRate: number;

    constructor() {
        this.weights = {
            ratingDiffWeight: 0.15,
            bias: 0.05,
        };
        this.learningRate = 0.003;
    }

    predict(teamA: Team, teamB: Team): Prediction {
        const ratingDiff = teamA.averageRating() - teamB.averageRating();
        const scoreDiff = ratingDiff * this.weights.ratingDiffWeight + this.weights.bias;
        const teamAWinProbability = this.sigmoid(scoreDiff / 5);

        return {
            teamAWinProbability,
            expectedScoreA: 85 + teamA.averageRating() * 0.35 + scoreDiff,
            expectedScoreB: 85 + teamB.averageRating() * 0.35 - scoreDiff,
        };
    }

    train(teamA: Team, teamB: Team, winner: string): void {
        const actual = winner === teamA.name ? 1 : 0;
        const prediction = this.predict(teamA, teamB).teamAWinProbability;
        const error = actual - prediction;
        const ratingDiff = teamA.averageRating() - teamB.averageRating();

        this.weights.ratingDiffWeight += this.learningRate * error * ratingDiff;
        this.weights.bias += this.learningRate * error;

        this.weights.ratingDiffWeight = this.clamp(this.weights.ratingDiffWeight, -1.0, 1.0);
        this.weights.bias = this.clamp(this.weights.bias, -2.0, 2.0);
    }

    getWeights(): ModelWeights {
        return { ...this.weights };
    }

    private sigmoid(value: number): number {
        return 1 / (1 + Math.exp(-value));
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
}
