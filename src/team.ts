import { Player, PlayerStatistics } from './player';

export class Team {
    name: string;
    players: Player[];

    constructor(name: string) {
        this.name = name;
        this.players = [];
    }

    addPlayer(player: Player): void {
        if (this.players.length < 5) {
            this.players.push(player);
        } else {
            throw new Error('Team can only have 5 players.');
        }
    }

    averageRating(): number {
        if (this.players.length === 0) {
            return 0;
        }
        const total = this.players.reduce((sum, player) => sum + player.rating, 0);
        return total / this.players.length;
    }

    resetStats(): void {
        this.players.forEach(player => player.resetStats());
    }

    calculateTeamScore(): number {
        return this.players.reduce((total, player) => total + player.statistics.points, 0);
    }

    getPlayerStats(): Array<{ name: string; position: string; rating: number; statistics: PlayerStatistics }> {
        return this.players.map(player => ({
            name: player.name,
            position: player.position,
            rating: player.rating,
            statistics: { ...player.statistics },
        }));
    }
}
