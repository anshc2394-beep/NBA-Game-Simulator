import { Team } from './team';
import { Player } from './player';
import { GameTrainer } from './model/trainer';

export interface PlayerSummary {
    name: string;
    position: string;
    rating: number;
    statistics: {
        points: number;
        assists: number;
        rebounds: number;
        steals: number;
        blocks: number;
    };
}

export interface GameResult {
    winner: string;
    scoreA: number;
    scoreB: number;
    prediction: {
        teamAWinProbability: number;
        expectedScoreA: number;
        expectedScoreB: number;
    };
    playerStats: {
        teamA: PlayerSummary[];
        teamB: PlayerSummary[];
    };
    modelWeights: {
        ratingDiffWeight: number;
        bias: number;
    };
}

export class GameSimulator {
    teamA: Team;
    teamB: Team;
    private trainer: GameTrainer;

    constructor(teamA: Team, teamB: Team, trainer?: GameTrainer) {
        this.teamA = teamA;
        this.teamB = teamB;
        this.trainer = trainer ?? new GameTrainer();
    }

    simulateGame(): GameResult {
        this.teamA.resetStats();
        this.teamB.resetStats();

        const prediction = this.trainer.predict(this.teamA, this.teamB);

        this.teamA.players.forEach(player => {
            player.updateStats(this.generatePlayerStats(player));
        });
        this.teamB.players.forEach(player => {
            player.updateStats(this.generatePlayerStats(player));
        });

        const scoreA = this.teamA.calculateTeamScore();
        const scoreB = this.teamB.calculateTeamScore();

        let winner = scoreA > scoreB ? this.teamA.name : this.teamB.name;
        if (scoreA === scoreB) {
            winner = prediction.teamAWinProbability >= 0.5 ? this.teamA.name : this.teamB.name;
        }

        this.trainer.train(this.teamA, this.teamB, winner);

        return {
            winner,
            scoreA,
            scoreB,
            prediction,
            playerStats: {
                teamA: this.teamA.getPlayerStats(),
                teamB: this.teamB.getPlayerStats(),
            },
            modelWeights: this.trainer.getModelState(),
        };
    }

    simulateSeries(rounds: number): GameResult[] {
        const results: GameResult[] = [];
        for (let i = 0; i < rounds; i++) {
            results.push(this.simulateGame());
        }
        return results;
    }

    private generatePlayerStats(player: Player) {
        const points = this.clamp(
            Math.round(player.rating * (0.8 + Math.random() * 0.8) + (Math.random() - 0.5) * 10),
            4,
            45
        );
        const assists = this.clamp(
            Math.round((player.position === 'Guard' ? 4 : 2) + Math.random() * 5),
            0,
            12
        );
        const rebounds = this.clamp(
            Math.round((player.position === 'Center' ? 6 : 3) + Math.random() * 6),
            0,
            16
        );
        const steals = this.clamp(Math.round(Math.random() * 3), 0, 5);
        const blocks = this.clamp(Math.round(Math.random() * 3), 0, 5);

        return {
            points,
            assists,
            rebounds,
            steals,
            blocks,
        };
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
}
