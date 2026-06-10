export interface PlayerStatistics {
    points: number;
    assists: number;
    rebounds: number;
    steals: number;
    blocks: number;
}

export class Player {
    name: string;
    position: string;
    rating: number;
    statistics: PlayerStatistics;

    constructor(name: string, position: string, rating: number) {
        this.name = name;
        this.position = position;
        this.rating = rating;
        this.statistics = {
            points: 0,
            assists: 0,
            rebounds: 0,
            steals: 0,
            blocks: 0,
        };
    }

    updateStats(newStats: Partial<PlayerStatistics>) {
        if (newStats.points !== undefined) {
            this.statistics.points += newStats.points;
        }
        if (newStats.assists !== undefined) {
            this.statistics.assists += newStats.assists;
        }
        if (newStats.rebounds !== undefined) {
            this.statistics.rebounds += newStats.rebounds;
        }
        if (newStats.steals !== undefined) {
            this.statistics.steals += newStats.steals;
        }
        if (newStats.blocks !== undefined) {
            this.statistics.blocks += newStats.blocks;
        }
    }

    resetStats() {
        this.statistics = {
            points: 0,
            assists: 0,
            rebounds: 0,
            steals: 0,
            blocks: 0,
        };
    }

    getTotalContribution(): number {
        return (
            this.statistics.points +
            this.statistics.assists * 1.5 +
            this.statistics.rebounds * 1.2 +
            this.statistics.steals * 2 +
            this.statistics.blocks * 2
        );
    }
}
